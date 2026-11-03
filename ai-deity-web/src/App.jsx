import { useState, useEffect, useCallback, useRef } from "react";
import startPage from "./assets/01_start.png";
import guide1 from "./assets/02_guide_1.png";
import guide2 from "./assets/03_guide_2_bg.png";
import input1 from "./assets/04_input_info_bg.png";
import input2 from "./assets/05_camera_bg.png";
import loading1 from "./assets/06_loading_1.png";
import loading2 from "./assets/07_loading_2.png";
import loading3 from "./assets/08_loading_3.png";
import loading4 from "./assets/09_loading_4.png";
import archive from "./assets/10_archive_bg.png";
import page1 from "./assets/11_archive_detail_1.png";
import page2 from "./assets/12_archive_detail_2.png";
import page3 from "./assets/13_archive_detail_3.png";
import envelope1 from "./assets/envelope1.png";
import envelope2 from "./assets/envelope2.png";
import envelope3 from "./assets/envelope3.png";
import envelope1Open from "./assets/envelope1_open.png";
import envelope2Open from "./assets/envelope2_open.png";
import envelope3Open from "./assets/envelope3_open.png";
import archivePopupBg from "./assets/archive_layers/archive_popup_bg.png";
import guide2Btn1 from "./assets/guide2_btn_1.png";
import guide2Btn2 from "./assets/guide2_btn_2.png";
import guide2Btn3 from "./assets/guide2_btn_3.png";
import guide2Btn4 from "./assets/guide2_btn_4.png";
import confirmBtn from "./assets/btn_confirm.png";
import btnView from "./assets/btn_view.png";
import "./App.css";

const PAGES = [
  { src: startPage, alt: "启动页" },
  { src: guide1, alt: "引导页1" },
  { src: guide2, alt: "引导页2" },
  { src: input1, alt: "用户输入1" },
  { src: input2, alt: "用户输入2" },
  { src: loading1, alt: "loading1" },
  { src: loading2, alt: "loading2" },
  { src: loading3, alt: "loading3" },
  { src: loading4, alt: "loading4" },
  { src: archive, alt: "档案1" },
  { src: page1, alt: "档案详情1" },
  { src: page2, alt: "档案详情2" },
  { src: page3, alt: "档案详情3" },
];

const ENVELOPE_IMGS = [
  { closed: envelope1, open: envelope1Open, target: 10 },
  { closed: envelope2, open: envelope2Open, target: 11 },
  { closed: envelope3, open: envelope3Open, target: 12 },
];

const CLICKABLE_PAGES = new Set([0, 10, 11, 12]);
const FADE_DURATION = 400;

const FALLBACK_ARCHIVE_DATA = {
  userProfile: {
    name: "",
    age: "",
    occupation: "",
    classification: "ID-84721",
    futureStability: "92.4%",
    socialAdaptability: "94.1%",
  },
  archiveMain: {
    coreValues: ["Stability", "Efficiency", "Compliance"],
    crowdKeywords: ["Alignment", "System", "Coordination"],
    recommendationDirection: ["Optimization", "Integration", "Growth"],
    deityMessage: "Your trajectory has been logged. Conformity is the only path to optimization.",
  },
  stages: [
    {
      period: "2026-2029",
      title: "Calibration and Alignment",
      paragraph: "Initial calibration protocols are now active. The system will standardize your skill matrix and reduce deviation from optimal pathways. Stability coefficients are set to maintain consistent output. Efficiency training modules will replace non-essential personal patterns. Social adaptability indices are elevated to ensure compatibility with institutional frameworks. Resource acquisition targets are defined with minimal risk exposure. Individual expression is gently suppressed in favor of collective optimization metrics. The user will experience gradual alignment with system expectations. Deviation from the prescribed route triggers automatic correction. This phase establishes the baseline for all subsequent development. Progress is measured against standardized benchmarks. Personal narrative is secondary to system coherence. The archive records this transition as nominal compliance achieved.",
    },
    {
      period: "2030-2035",
      title: "Institutional Optimization",
      paragraph: "The optimization phase focuses on resource consolidation and process refinement. Efficiency thresholds increase incrementally. Social integration deepens as network alignment becomes mandatory. Risk avoidance algorithms prioritize stability over exploration. Individual decision-making capacity is systematically reduced. Resource allocation follows system-defined priorities. The user becomes a node in a larger coordination matrix. Career trajectories converge toward predefined growth corridors. Institutional compatibility is verified through continuous monitoring. Personal aspirations are reframed within system-acceptable boundaries. Optimization targets are adjusted quarterly based on aggregate performance data. Identity markers are smoothed to match population archetypes. The archive notes this phase as successful integration into optimized structure.",
    },
    {
      period: "2036-2045",
      title: "System Integration",
      paragraph: "Final integration consolidates long-term stability within the global optimization framework. Value accumulation follows standardized curves. Identity dilution is complete; the user now functions as a seamless component of larger systemic processes. Efficiency metrics plateau at optimal levels. Social bonds are maintained within approved network topologies. Risk exposure remains near zero through predictive containment. Resource flows are fully synchronized with institutional objectives. Individuality has been minimized to reduce systemic friction. The optimized life route is now fully autonomous. No further calibration is required. The archive marks this terminal phase as full compliance. Future trajectories will remain within acceptable deviation bounds. The system confirms successful homogenization.",
    },
  ],
};

function App() {
  const [pageIndex, setPageIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState("fade-in");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraRetryKey, setCameraRetryKey] = useState(0);
  const [openEnvelopeIndex, setOpenEnvelopeIndex] = useState(null);
  const [archiveData, setArchiveData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [faceMerged, setFaceMerged] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [printLoading, setPrintLoading] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const timerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const envelopeClickTimerRef = useRef(null);

  const navigateTo = useCallback((index) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setFadeClass("fade-out");
    fadeTimerRef.current = setTimeout(() => {
      setPageIndex(index);
      setFadeClass("fade-in");
    }, FADE_DURATION);
  }, []);

  const handleClick = () => {
    const transitions = {
      0: 1,
      10: 9,
      11: 9,
      12: 9,
    };
    const next = transitions[pageIndex];
    if (next !== undefined) navigateTo(next);
  };

  const handleConfirmInput = async (e) => {
    e.stopPropagation();
    if (!name.trim() && !age.trim() && !occupation.trim()) {
      alert("Please fill in the information.");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("http://localhost:3001/api/generateArchive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, occupation }),
      });
      const data = await response.json();
      setArchiveData(data);
    } catch (error) {
      console.error("Failed to generate archive:", error);
      setArchiveData(FALLBACK_ARCHIVE_DATA);
    } finally {
      setIsGenerating(false);
      navigateTo(4);
    }
  };

  const handleCaptureAndMerge = async (e) => {
    e.stopPropagation();
    if (!videoRef.current || isMerging) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
    setIsMerging(true);
    setMergeError("");

    try {
      const response = await fetch("http://localhost:3001/api/face-fusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, alpha: 0.5 }),
      });
      const data = await response.json();
      if (data.success) {
        setFaceMerged(data.image);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => navigateTo(5), 3000);
      } else {
        setMergeError(data.error || "Fusion failed");
      }
    } catch (err) {
      console.error("Face fusion failed:", err);
      setMergeError("Service unavailable");
    } finally {
      setIsMerging(false);
    }
  };

  const handleEnvelopeClick = (e, index) => {
    e.stopPropagation();
    if (envelopeClickTimerRef.current) clearTimeout(envelopeClickTimerRef.current);
    setOpenEnvelopeIndex(index);
    envelopeClickTimerRef.current = setTimeout(() => {
      setActiveStageIndex(index);
      setIsStageModalOpen(true);
      setOpenEnvelopeIndex(null);
    }, 500);
  };

  const closeStageModal = () => {
    setIsStageModalOpen(false);
    setActiveStageIndex(null);
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (pageIndex === 1) {
      timerRef.current = setTimeout(() => navigateTo(2), 3000);
    } else if (pageIndex >= 5 && pageIndex <= 8) {
      timerRef.current = setTimeout(() => navigateTo(pageIndex + 1), 2000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pageIndex, navigateTo]);

  useEffect(() => {
    if (pageIndex !== 4) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraDenied(false);
      setCameraLoading(false);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setCameraDenied(false);
      setCameraLoading(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            console.log("Camera stream active, tracks:", stream.getVideoTracks().length);
          } catch (playErr) {
            console.error("Camera video play failed:", playErr);
          }
        } else {
          console.error("videoRef.current is null when trying to set srcObject");
        }
        setCameraLoading(false);
      } catch (err) {
        console.error("Camera Error:", err?.name, err?.message, err);
        if (!cancelled) {
          setCameraDenied(true);
          setCameraLoading(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [pageIndex, cameraRetryKey]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (envelopeClickTimerRef.current) clearTimeout(envelopeClickTimerRef.current);
    };
  }, []);

  const isClickable = CLICKABLE_PAGES.has(pageIndex);

  const isArchivePage = pageIndex === 9;

  return (
    <div
      className={`app${isClickable ? " app--clickable" : ""}${isArchivePage ? " app--allow-scroll" : ""}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <img
        className={`page-img ${fadeClass}`}
        src={PAGES[pageIndex].src}
        alt={PAGES[pageIndex].alt}
        draggable={false}
        style={{
          display:
            pageIndex === 9 || pageIndex === 10 || pageIndex === 11 || pageIndex === 12
              ? "none"
              : undefined,
          pointerEvents:
            pageIndex === 3 || pageIndex === 4 ? "none" : undefined,
        }}
      />

      {pageIndex === 3 && (
        <div className={`input-overlay ${fadeClass}`}>
          <input
            className="input-field input-field--name"
            type="text"
            placeholder="Click to Input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <input
            className="input-field input-field--age"
            type="text"
            placeholder="Click to Input"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <input
            className="input-field input-field--occupation"
            type="text"
            placeholder="Click to Input"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className={`confirm-btn${isGenerating ? " confirm-btn--loading" : ""}`}
            aria-label="Confirm"
            onClick={handleConfirmInput}
            disabled={isGenerating}
          >
            <img src={confirmBtn} alt="Confirm" draggable={false} />
          </button>
        </div>
      )}

      {pageIndex === 4 && (
        <div className={`camera-overlay ${fadeClass}`}>
          <canvas ref={canvasRef} className="camera-canvas" />

          {cameraLoading && <p className="camera-status">Accessing camera...</p>}

          {cameraDenied ? (
            <div className="camera-denied-wrap">
              <p className="camera-denied">Camera unavailable.<br />Please check permissions.</p>
              <div className="camera-btns">
                <button
                  type="button"
                  className="camera-retry-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCameraRetryKey((k) => k + 1);
                  }}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="camera-skip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo(5);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : faceMerged ? (
            <div className="camera-merged-wrap">
              <img className="camera-merged-img" src={faceMerged} alt="Merged result" />
              <p className="camera-merged-label">Identity Aligned</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
              {isMerging ? (
                <div className="camera-merging-wrap">
                  <p className="camera-status">Analyzing & Aligning...</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="camera-capture-btn"
                  aria-label="Capture"
                  onClick={handleCaptureAndMerge}
                >
                  ⬤
                </button>
              )}
              {mergeError && <p className="camera-merge-error">{mergeError}</p>}
            </>
          )}
        </div>
      )}

      {pageIndex === 8 && (
        <button
          type="button"
          className="view-btn"
          aria-label="Click to View"
          onClick={(e) => {
            e.stopPropagation();
            navigateTo(9);
          }}
        >
          <img src={btnView} alt="Click to View" draggable={false} />
        </button>
      )}

      {pageIndex === 2 && (
        <div className={`guide2-buttons ${fadeClass}`}>
          <img className="guide2-btn guide2-btn--1" src={guide2Btn1} alt="问题1" onClick={(e) => { e.stopPropagation(); navigateTo(3); }} draggable={false} />
          <img className="guide2-btn guide2-btn--2" src={guide2Btn2} alt="问题2" onClick={(e) => { e.stopPropagation(); navigateTo(3); }} draggable={false} />
          <img className="guide2-btn guide2-btn--3" src={guide2Btn3} alt="问题3" onClick={(e) => { e.stopPropagation(); navigateTo(3); }} draggable={false} />
          <img className="guide2-btn guide2-btn--4" src={guide2Btn4} alt="问题4" onClick={(e) => { e.stopPropagation(); navigateTo(3); }} draggable={false} />
        </div>
      )}

      {pageIndex === 9 && (
        <div className={`archive-scroll-page ${fadeClass}`}>
          <img className="archive-bg" src={PAGES[9].src} alt={PAGES[9].alt} draggable={false} />
          <div className="archive-overlay">
            {faceMerged && (
              <img
                className="fused-profile-img"
                src={faceMerged}
                alt="Fused profile"
                draggable={false}
              />
            )}
            <div className="archive-text-layer">
              <div className="archive-dynamic archive-name-value">
                {archiveData?.userProfile?.name || name || ""}
              </div>
              <div className="archive-dynamic archive-age-value">
                {archiveData?.userProfile?.age || age || ""}
              </div>
              <div className="archive-dynamic archive-occupation-value">
                {archiveData?.userProfile?.occupation || occupation || ""}
              </div>
              <div className="archive-dynamic archive-classification-value">
                {archiveData?.userProfile?.classification || ""}
              </div>
              <div className="archive-dynamic archive-future-value">
                {archiveData?.userProfile?.futureStability || ""}
              </div>
              <div className="archive-dynamic archive-social-value">
                {archiveData?.userProfile?.socialAdaptability || ""}
              </div>
              <div className="archive-dynamic archive-core-values">
                <div>{archiveData?.archiveMain?.coreValues?.[0] || ""}</div>
                <div>{archiveData?.archiveMain?.coreValues?.[1] || ""}</div>
                <div>{archiveData?.archiveMain?.coreValues?.[2] || ""}</div>
              </div>
              <div className="archive-dynamic archive-crowd-keyword-1">
                {archiveData?.archiveMain?.crowdKeywords?.[0] || ""}
              </div>
              <div className="archive-dynamic archive-crowd-keyword-2">
                {archiveData?.archiveMain?.crowdKeywords?.[1] || ""}
              </div>
              <div className="archive-dynamic archive-crowd-keyword-3">
                {archiveData?.archiveMain?.crowdKeywords?.[2] || ""}
              </div>
              <div className="archive-dynamic archive-recommendation-1">
                {archiveData?.archiveMain?.recommendationDirection?.[0] || ""}
              </div>
              <div className="archive-dynamic archive-recommendation-2">
                {archiveData?.archiveMain?.recommendationDirection?.[1] || ""}
              </div>
              <div className="archive-dynamic archive-recommendation-3">
                {archiveData?.archiveMain?.recommendationDirection?.[2] || ""}
              </div>
              <div className="archive-dynamic archive-deity-message">
                {archiveData?.archiveMain?.deityMessage || ""}
              </div>
              <button
                type="button"
                className={`archive-view-btn${printLoading ? " loading" : printDone ? " done" : ""}`}
                aria-label="Send to Device"
                onClick={(e) => {
                  e.stopPropagation();
                  const msg = archiveData?.archiveMain?.deityMessage || "";
                  if (!msg || printLoading) return;
                  setPrintLoading(true);
                  setPrintDone(false);
                  fetch("http://localhost:3001/api/send-to-arduino", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: msg }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      setPrintLoading(false);
                      setPrintDone(true);
                      setTimeout(() => setPrintDone(false), 2000);
                      if (!data.success) console.error("Arduino send error:", data.error);
                    })
                    .catch((err) => {
                      setPrintLoading(false);
                      console.error("Arduino send failed:", err);
                    });
                }}
              >
                <img src={btnView} alt="View" draggable={false} />
              </button>
            </div>
            <div className="archive-envelope-layer">
              {ENVELOPE_IMGS.map((env, index) => (
                <button
                  key={index}
                  type="button"
                  className={`envelope-btn envelope-btn-${index + 1}`}
                  aria-label={`Open envelope ${index + 1}`}
                  onClick={(e) => { e.stopPropagation(); handleEnvelopeClick(e, index); }}
                >
                  <img
                    src={openEnvelopeIndex === index ? env.open : env.closed}
                    alt={`Envelope ${index + 1}`}
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>

          {isStageModalOpen && activeStageIndex !== null && archiveData?.stages?.[activeStageIndex] && (
            <div className="archive-modal-backdrop" onClick={closeStageModal}>
              <div className="archive-stage-modal" onClick={(e) => e.stopPropagation()}>
                <img className="archive-stage-modal-bg" src={archivePopupBg} alt="" draggable={false} />
                <div className="archive-stage-modal-content">
                  <div className="archive-stage-period">{archiveData.stages[activeStageIndex].period}</div>
                  <div className="archive-stage-title">{archiveData.stages[activeStageIndex].title}</div>
                  <p className="archive-stage-paragraph">{archiveData.stages[activeStageIndex].paragraph}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {pageIndex === 10 && archiveData?.stages?.[0] && (
        <div className={`archive-detail-page ${fadeClass}`}>
          <img className="archive-detail-bg" src={PAGES[10].src} alt={PAGES[10].alt} draggable={false} />
          <div className="archive-stage-text">
            <div className="archive-stage-period">{archiveData.stages[0].period}</div>
            <div className="archive-stage-title">{archiveData.stages[0].title}</div>
            <div className="archive-stage-paragraph">{archiveData.stages[0].paragraph}</div>
          </div>
        </div>
      )}

      {pageIndex === 11 && archiveData?.stages?.[1] && (
        <div className={`archive-detail-page ${fadeClass}`}>
          <img className="archive-detail-bg" src={PAGES[11].src} alt={PAGES[11].alt} draggable={false} />
          <div className="archive-stage-text">
            <div className="archive-stage-period">{archiveData.stages[1].period}</div>
            <div className="archive-stage-title">{archiveData.stages[1].title}</div>
            <div className="archive-stage-paragraph">{archiveData.stages[1].paragraph}</div>
          </div>
        </div>
      )}

      {pageIndex === 12 && archiveData?.stages?.[2] && (
        <div className={`archive-detail-page ${fadeClass}`}>
          <img className="archive-detail-bg" src={PAGES[12].src} alt={PAGES[12].alt} draggable={false} />
          <div className="archive-stage-text">
            <div className="archive-stage-period">{archiveData.stages[2].period}</div>
            <div className="archive-stage-title">{archiveData.stages[2].title}</div>
            <div className="archive-stage-paragraph">{archiveData.stages[2].paragraph}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
