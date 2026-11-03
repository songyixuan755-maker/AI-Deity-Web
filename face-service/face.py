import cv2
import numpy as np
import insightface
import os
import sys

# =====================================================================
# 初始化
# =====================================================================
print("正在初始化核心 AI 模型体系...")
model_path = "inswapper_128.onnx"

if not os.path.exists(model_path):
    print(f"❌ 错误：找不到模型文件 '{model_path}'，请放置在代码同级目录。")
    sys.exit()

try:
    app = insightface.app.FaceAnalysis(name='buffalo_l')
    app.prepare(ctx_id=-1, det_size=(640, 640))
    swapper = insightface.model_zoo.get_model(model_path)

    # 获取识别模型（用于提取 embedding）
    rec_model = None
    if 'recognition' in app.models:
        rec_model = app.models['recognition']
    else:
        for key, model in app.models.items():
            if 'recog' in key.lower():
                rec_model = model
                break
    if rec_model is None:
        print("❌ 未找到识别模型，请确认 buffalo_l 包完整。")
        sys.exit()

    print("✅ 模型加载完毕。")
except Exception as e:
    print(f"❌ 初始化失败: {e}")
    sys.exit()


# =====================================================================
def capture_photo(save_path="captured_photo.jpg"):
    """拍照"""
    print("\n正在打开摄像头...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("错误：无法打开摄像头。")
        sys.exit()
    print("按【空格键】拍照，按【ESC】退出。")
    captured = False
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        cv2.imshow("Camera", frame)
        key = cv2.waitKey(1)
        if key == 32:
            cv2.imwrite(save_path, frame)
            captured = True
            print("✅ 拍照成功！")
            break
        elif key == 27:
            break
    cap.release()
    cv2.destroyAllWindows()
    return captured


def process_and_blend(alpha=0.5):
    """人脸融合（自动选择最佳方案）"""
    target_path = "captured_photo.jpg"
    target_img = cv2.imread(target_path)
    if target_img is None:
        print("❌ 无法读取拍照图片。")
        return

    # 1. 检测您的脸
    target_faces = app.get(target_img)
    if not target_faces:
        print("❌ 未在您的照片中检测到清晰人脸。")
        return
    target_face = target_faces[0]

    # 2. 性别判断 + 素材选择
    gender = getattr(target_face, 'sex', 'M')
    if gender == 'F':
        source_path = "female_average.png"
        print("检测为女性，使用素材:", source_path)
    else:
        source_path = "male_average.png"
        print("检测为男性，使用素材:", source_path)

    if not os.path.exists(source_path):
        print(f"❌ 找不到素材 {source_path}")
        return

    source_img = cv2.imread(source_path)
    source_faces = app.get(source_img)
    if not source_faces:
        print("❌ 素材图中未检测到人脸。")
        return
    source_face = source_faces[0]

    # ---- 方案1：尝试使用 embedding 融合（若模型支持） ----
    try:
        print("尝试 AI 身份向量融合...")
        emb_target = rec_model.get(target_img, target_face).flatten()
        emb_source = rec_model.get(source_img, source_face).flatten()
        blended_emb = (1 - alpha) * emb_target + alpha * emb_source
        blended_emb = blended_emb / np.linalg.norm(blended_emb)

        # 试一下 swapper.get 是否接受 embedding
        result = swapper.get(target_img, target_face, blended_emb, paste_back=True)
        cv2.imshow("AI 融合结果（embedding 模式）", result)
        cv2.imwrite("final_fusion.jpg", result)
        print("✅ 融合完成（embedding 插值）。")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        return
    except Exception as e1:
        print(f"⚠️ embedding 模式不可用（{e1}），切换为像素混合模式...")

    # ---- 方案2：像素混合（稳如泰山，效果也很棒） ----
    try:
        # 生成“完全像您”的版本（其实和原图一致，但为了保险我们换一次）
        img_self = swapper.get(target_img, target_face, target_face, paste_back=True)
        # 生成“完全像素材”的版本
        img_source = swapper.get(target_img, target_face, source_face, paste_back=True)

        # 像素级加权融合（alpha 控制像素材的程度）
        blended = cv2.addWeighted(img_self, 1 - alpha, img_source, alpha, 0)

        cv2.imshow("AI 融合结果（像素混合模式）", blended)
        cv2.imwrite("final_fusion.jpg", blended)
        print("✅ 融合完成（像素混合）。")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    except Exception as e2:
        print(f"❌ 像素融合也失败了: {e2}")


if __name__ == "__main__":
    if capture_photo():
        process_and_blend(alpha=0.5)