"""
人脸融合 API 服务 — 为 DIVINE 前端提供人脸融合接口
"""
import cv2
import numpy as np
import insightface
import os
import sys
import base64
import time
import serial
import serial.tools.list_ports
from flask import Flask, request, jsonify
from flask_cors import CORS
from rembg import remove

app_server = Flask(__name__)
CORS(app_server)

# =====================================================================
# 加载模型（启动时一次性完成）
# =====================================================================
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inswapper_128.onnx")
MALE_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "male_average.png")
FEMALE_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "female_average.png")

print("正在初始化 AI 模型体系...", flush=True)

if not os.path.exists(MODEL_PATH):
    print("ERROR: Model file not found: " + MODEL_PATH, flush=True)
    sys.exit(1)

face_app = insightface.app.FaceAnalysis(name='buffalo_l')
face_app.prepare(ctx_id=-1, det_size=(640, 640))
swapper = insightface.model_zoo.get_model(MODEL_PATH)

rec_model = None
if 'recognition' in face_app.models:
    rec_model = face_app.models['recognition']
else:
    for key, model in face_app.models.items():
        if 'recog' in key.lower():
            rec_model = model
            break
if rec_model is None:
    print("ERROR: Recognition model not found", flush=True)
    sys.exit(1)

print("OK: Model loaded, API ready.", flush=True)

# =====================================================================
# 核心融合函数 — 不抛异常，返回 (success, image_bytes_or_error)
# =====================================================================
def remove_background_and_encode(bgr_img):
    """抠除背景，返回 PNG 字节（保留 Alpha 透明通道）"""
    rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    result = remove(rgb_img)  # rembg 返回 RGBA
    result_bgr = cv2.cvtColor(result, cv2.COLOR_RGBA2BGRA)
    success, buf = cv2.imencode('.png', result_bgr)
    if not success:
        raise RuntimeError("PNG 编码失败")
    return buf.tobytes()

def process_fusion(image_bytes, alpha=0.5):
    """返回 (success: bool, data: bytes|str)"""
    try:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        target_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        return False, "图像数据解析失败"

    if target_img is None:
        return False, "图像数据解析失败"

    print(f"图片尺寸: {target_img.shape}", flush=True)

    # 1. 检测人脸
    target_faces = face_app.get(target_img)
    if not target_faces:
        return False, "未在照片中检测到清晰人脸"
    target_face = target_faces[0]
    print(f"检测到人脸, bbox: {getattr(target_face, 'bbox', 'N/A')}, kps: {getattr(target_face, 'kps', None) is not None}", flush=True)

    # 2. 性别判断
    gender = getattr(target_face, 'sex', 'M')
    if gender == 'F':
        source_path = FEMALE_SRC
        print("检测为女性，使用女性素材", flush=True)
    else:
        source_path = MALE_SRC
        print("检测为男性，使用男性素材", flush=True)

    if not os.path.exists(source_path):
        return False, f"找不到素材 {os.path.basename(source_path)}"

    # 使用 np.fromfile + cv2.imdecode 替代 cv2.imread，兼容中文路径
    source_img = cv2.imdecode(np.fromfile(source_path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if source_img is None:
        print("Source material read failed: " + source_path, flush=True)
        return False, f"素材图片读取失败: {source_path}"
    source_faces = face_app.get(source_img)
    if not source_faces:
        return False, "素材图中未检测到人脸"
    source_face = source_faces[0]
    print(f"素材人脸检测成功, kps: {getattr(source_face, 'kps', None) is not None}", flush=True)

    # ---- 方案1：embedding 融合 ----
    try:
        print("尝试 AI 身份向量融合...", flush=True)
        emb_target = rec_model.get(target_img, target_face).flatten()
        emb_source = rec_model.get(source_img, source_face).flatten()
        blended_emb = (1 - alpha) * emb_target + alpha * emb_source
        blended_emb = blended_emb / np.linalg.norm(blended_emb)

        result = swapper.get(target_img, target_face, blended_emb, paste_back=True)
        if result is None:
            raise RuntimeError("swapper 返回 None (embedding 模式)")
        png_bytes = remove_background_and_encode(result)
        print("OK: Fusion complete (embedding + rembg), transparent PNG output.", flush=True)
        return True, png_bytes
    except Exception as e1:
        print(f"WARNING: embedding mode unavailable ({e1}), switching to pixel blend mode...", flush=True)

    # ---- 方案2：像素混合 ----
    try:
        print("尝试像素混合...", flush=True)
        img_self = swapper.get(target_img, target_face, target_face, paste_back=True)
        if img_self is None:
            raise RuntimeError("swapper 对 target->target 返回 None")
        print(f"  img_self 成功, shape={img_self.shape}", flush=True)

        img_source = swapper.get(target_img, target_face, source_face, paste_back=True)
        if img_source is None:
            raise RuntimeError("swapper 对 target->source 返回 None")
        print(f"  img_source 成功, shape={img_source.shape}", flush=True)

        blended = cv2.addWeighted(img_self, 1 - alpha, img_source, alpha, 0)
        print(f"  blended shape={blended.shape}", flush=True)

        png_bytes = remove_background_and_encode(blended)
        print("OK: Fusion complete (pixel blend + rembg), transparent PNG output.", flush=True)
        return True, png_bytes
    except Exception as e2:
        print(f"ERROR: Pixel fusion failed: {e2}", flush=True)

    # ---- 方案3：退回原图 + 抠图 ----
        print("WARNING: All fusion methods failed, returning original with rembg", flush=True)
    try:
        png_bytes = remove_background_and_encode(target_img)
        return True, png_bytes
    except Exception:
        success, buffer = cv2.imencode('.png', target_img)
        if not success:
            return False, "原图编码失败"
        return True, buffer.tobytes()


# =====================================================================
# API 路由
# =====================================================================
@app_server.route("/api/face-fusion", methods=["POST"])
def face_fusion():
    try:
        # 解析请求
        data = request.get_json(silent=True)
        if not data or "image" not in data:
            return jsonify({"success": False, "error": "缺少 image 字段"}), 400

        # 解码 base64（兼容 data:image 前缀）
        image_b64 = data["image"]
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_b64)

        alpha = float(data.get("alpha", 0.5))
        alpha = max(0.0, min(1.0, alpha))

        ok, result = process_fusion(image_bytes, alpha)

        if not ok:
            return jsonify({"success": False, "error": result}), 500

        result_b64 = base64.b64encode(result).decode("utf-8")
        return jsonify({
            "success": True,
            "image": f"data:image/png;base64,{result_b64}",
        })
    except Exception as e:
        import traceback
        print("==== /api/face-fusion failed ====", flush=True)
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }), 500


@app_server.errorhandler(Exception)
def handle_exception(e):
    print(f"Unhandled exception: {e}", flush=True)
    import traceback
    traceback.print_exc()
    return jsonify({"success": False, "error": str(e)}), 500


@app_server.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# =====================================================================
# 串口管理
# =====================================================================
def find_arduino_port():
    """自动查找 Arduino 串口"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB Serial" in port.description:
            return port.device
    if ports:
        return ports[0].device
    return None


def get_serial_connection():
    """获取或创建串口连接"""
    global _serial_conn
    if _serial_conn is None or not _serial_conn.is_open:
        port = find_arduino_port()
        if port is None:
            return None, "未找到 Arduino 串口"
        try:
            _serial_conn = serial.Serial(port, 9600, timeout=1)
            time.sleep(2)  # 等待 Arduino 重置
            return _serial_conn, None
        except Exception as e:
            return None, str(e)
    return _serial_conn, None


_serial_conn = None


@app_server.route("/api/send-to-arduino", methods=["POST"])
def send_to_arduino():
    """接收消息并通过串口发送给 Arduino"""
    data = request.get_json(silent=True)
    if not data or "message" not in data:
        return jsonify({"success": False, "error": "Missing message field"}), 200

    message = data["message"]
    print(f"Received message for Arduino: {message}", flush=True)

    conn, err = get_serial_connection()
    if err:
        print(f"Serial connection error: {err}", flush=True)
        return jsonify({"success": False, "error": err}), 200

    try:
        # 确保消息以换行符结尾
        cmd = message.strip() + "\n"
        conn.write(cmd.encode("utf-8"))
        conn.flush()
        print(f"Sent to Arduino: {cmd.strip()}", flush=True)
        return jsonify({"success": True, "sent": cmd.strip()})
    except Exception as e:
        print(f"Failed to send: {e}", flush=True)
        return jsonify({"success": False, "error": str(e)}), 200


@app_server.route("/api/arduino-status", methods=["GET"])
def arduino_status():
    """查询 Arduino 连接状态"""
    port = find_arduino_port()
    if port:
        conn, _ = get_serial_connection()
        connected = conn is not None and conn.is_open
        return jsonify({"connected": connected, "port": port})
    return jsonify({"connected": False, "port": None})


if __name__ == "__main__":
    app_server.run(host="0.0.0.0", port=3002, debug=False)
