export interface FaceMeshLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks: FaceMeshLandmark[][];
  imageWidth: number;
  imageHeight: number;
}

export interface FaceMeshInstance {
  setOptions: (opts: Record<string, unknown>) => void;
  onResults: (cb: (results: FaceMeshResults) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement | HTMLCanvasElement }) => Promise<void>;
  close: () => void;
}

export interface FaceMeshConstructor {
  new (config: { locateFile: (file: string) => string }): FaceMeshInstance;
}

const CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4";

let loadPromise: Promise<FaceMeshConstructor> | null = null;

export function loadFaceMeshLib(): Promise<FaceMeshConstructor> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const win = window as typeof window & { FaceMesh?: FaceMeshConstructor };
    if (win.FaceMesh) {
      resolve(win.FaceMesh);
      return;
    }

    const script = document.createElement("script");
    script.src = `${CDN_BASE}/face_mesh.js`;
    script.crossOrigin = "anonymous";
    script.async = true;

    script.onload = () => {
      if (win.FaceMesh) {
        resolve(win.FaceMesh);
      } else {
        reject(new Error("FaceMesh global not found after script loaded"));
      }
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load MediaPipe Face Mesh from CDN"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function createFaceMesh(
  onResults: (results: FaceMeshResults) => void
): Promise<FaceMeshInstance> {
  const FaceMeshCtor = await loadFaceMeshLib();

  const instance = new FaceMeshCtor({
    locateFile: (file: string) => `${CDN_BASE}/${file}`,
  });

  instance.setOptions({
    maxNumFaces: 2,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: false,
  });

  instance.onResults(onResults);
  await instance.initialize();

  return instance;
}
