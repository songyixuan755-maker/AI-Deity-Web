# AI-Deity-Web — DIVINE

**An interactive artwork about AI authority, identity and the homogenization of imagined futures.**

DIVINE invites a participant to enter personal information, capture a portrait and receive a three-stage future archive. The archive looks personalized while its prompt deliberately steers participants toward similar values and life trajectories. A Python service blends the captured face with a reference portrait and attempts background removal.

This is a **portfolio source-code edition**, containing the frontend, Node.js backend, Python face service and Arduino receiver. It is not a hosted website. Images, reference portraits and model weights must be restored separately before running the complete installation.

## Start here

| Component | Main code | Role |
| --- | --- | --- |
| React + Vite | [App.jsx](ai-deity-web/src/App.jsx), [App.css](ai-deity-web/src/App.css) | Page state, input, camera capture, archive, three letters and print requests. |
| Express | [index.js](server/index.js) | Qianfan generation prompt, fallback archive, face-service proxy and Arduino serial bridge; default port 3001. |
| Flask + InsightFace + rembg | [face_api.py](face-service/face_api.py) | Face analysis, blending, background removal and JSON API; port 3002. |
| Local Python prototype | [face.py](face-service/face.py) | Camera-based desktop prototype with OpenCV windows. |
| Arduino | [printer_receiver.ino](arduino/printer_receiver/printer_receiver.ino) | Newline-delimited USB serial input and printer commands. |

## Interaction

Introduction → personal information → camera capture → processing sequence → archive → three letters. The letters cover **2026–2029**, **2030–2035** and **2036–2045**. These are fictional outputs of the artwork, not predictions.

The face pipeline attempts embedding fusion, pixel blending and an original-image fallback. Background removal can also fall back to an opaque image. A returned image therefore does not necessarily indicate successful fusion.

## Local setup

1. Restore frontend images at the paths in [the asset inventory](docs/ASSETS.md). `App.jsx` imports them directly, so a frontend build requires them. Place `inswapper_128.onnx`, `male_average.png` and `female_average.png` beside `face-service/face_api.py`; the service also requires InsightFace `buffalo_l` models.
2. Copy `server/.env.example` to `server/.env`, supply your own Qianfan key and set the local Arduino port if needed.
3. Start each service in a separate terminal using the commands below. Create and activate a Python virtual environment before installing the Python dependencies.

```sh
# Python service
cd face-service
python -m pip install -r requirements-runtime.txt
python face_api.py
```

```sh
# Express backend, from repository root
cd server
npm ci
npm start
```

```sh
# React frontend, from repository root
cd ai-deity-web
npm ci
npm run dev
```

Open the URL printed by Vite and allow camera access when testing. Frontend API URLs are fixed to `http://localhost:3001`; the Express proxy targets `http://127.0.0.1:3002`. The backend currently uses Qianfan's OpenAI-compatible API and hard-coded model name `deepseek-v4-pro`; confirm availability for your account or update that value locally.

[requirements-runtime.txt](face-service/requirements-runtime.txt) lists direct runtime dependencies inferred from the imports. [requirements.txt](face-service/requirements.txt) preserves the uploaded environment snapshot, converted from UTF-16 to UTF-8. That snapshot contains extra packages and omits `rembg` and `pyserial`; installation and model compatibility have not been tested here.

For printing, open the Arduino sketch in Arduino IDE and configure your hardware. It uses USB serial at 9600 baud and printer serial on pins 10/11 at 115200 baud. The frontend uses the Express serial route; Python also provides serial endpoints, so avoid opening the same device from both services at once.

## API guide

| Service | Endpoint | Purpose |
| --- | --- | --- |
| Express | `POST /api/generateArchive` | Generate an archive from name, age and occupation; errors return fallback archive content with an error status. |
| Express | `POST /api/face-fusion` | Forward `image` to Flask and relay its response. |
| Express | `POST /api/send-to-arduino` | Send `message` as a newline-terminated serial command. |
| Flask | `POST /api/face-fusion` | Process a base64 image; accepts optional `alpha`. |
| Flask | `GET /api/health` | Service health after model initialization. |
| Flask | `POST /api/send-to-arduino` | Alternative Python serial bridge. |
| Flask | `GET /api/arduino-status` | Inspect the locally detected Arduino connection. |

The Express face proxy forwards only `image`; use the direct Flask endpoint to configure `alpha`. See the code for exact error statuses and fallback behaviour.

## Publication notes

Application logic is retained; the Python folder is normalized to `face-service`. Private `.env` values, installed dependencies, build output, model weights and participant portraits are excluded. The public configuration example contains no API credentials. [Chinese project notes](docs/PROJECT_NOTES.zh-CN.md) include directory, networking and response-status corrections.

Validation covers Python and Node.js syntax, JSON manifests, documentation links, credential checks and uploaded content hashes. No external AI calls, face-model execution, camera operation, hardware test or full frontend build has been performed from this source edition.
