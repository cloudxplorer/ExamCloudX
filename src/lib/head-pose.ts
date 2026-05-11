import type { FaceMeshLandmark } from "./mediapipe-loader";

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export class HeadPoseSmoother {
  private alpha: number;
  private smoothYaw: number | null = null;
  private smoothPitch: number | null = null;
  private smoothRoll: number | null = null;

  constructor(alpha = 0.25) {
    this.alpha = alpha;
  }

  smooth(raw: HeadPose): HeadPose {
    if (this.smoothYaw === null) {
      this.smoothYaw = raw.yaw;
      this.smoothPitch = raw.pitch;
      this.smoothRoll = raw.roll;
    } else {
      this.smoothYaw = this.alpha * raw.yaw + (1 - this.alpha) * this.smoothYaw;
      this.smoothPitch = this.alpha * raw.pitch + (1 - this.alpha) * this.smoothPitch;
      this.smoothRoll = this.alpha * raw.roll + (1 - this.alpha) * this.smoothRoll;
    }

    return {
      yaw: this.smoothYaw,
      pitch: this.smoothPitch,
      roll: this.smoothRoll,
    };
  }

  reset(): void {
    this.smoothYaw = null;
    this.smoothPitch = null;
    this.smoothRoll = null;
  }
}

export class HeadTurnDetector {
  private thresholdDeg: number;
  private minDurationMs: number;
  private violationStart: number | null = null;
  private lastFlagTime = 0;
  private flagCooldownMs: number;

  constructor(thresholdDeg = 60, minDurationMs = 1000, flagCooldownMs = 10000) {
    this.thresholdDeg = thresholdDeg;
    this.minDurationMs = minDurationMs;
    this.flagCooldownMs = flagCooldownMs;
  }

  check(smoothedYaw: number): { isViolating: boolean; shouldFlag: boolean; durationMs: number } {
    const now = performance.now();
    const absYaw = Math.abs(smoothedYaw);
    const isViolating = absYaw > this.thresholdDeg;

    if (isViolating) {
      if (this.violationStart === null) {
        this.violationStart = now;
      }
      const durationMs = now - this.violationStart;
      const shouldFlag =
        durationMs >= this.minDurationMs && now - this.lastFlagTime > this.flagCooldownMs;

      if (shouldFlag) {
        this.lastFlagTime = now;
      }

      return { isViolating: true, shouldFlag, durationMs };
    } else {
      this.violationStart = null;
      return { isViolating: false, shouldFlag: false, durationMs: 0 };
    }
  }

  reset(): void {
    this.violationStart = null;
    this.lastFlagTime = 0;
  }
}

function dist2d(a: FaceMeshLandmark, b: FaceMeshLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function estimateHeadPose(landmarks: FaceMeshLandmark[]): HeadPose {
  const noseTip = landmarks[1];
  const forehead = landmarks[10];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const chin = landmarks[152];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];

  const earMidX = (leftEar.x + rightEar.x) / 2;
  const faceWidth = dist2d(leftEar, rightEar);
  const noseOffset = noseTip.x - earMidX;
  const yawRatio = faceWidth > 0.001 ? noseOffset / faceWidth : 0;
  const yawDeg = Math.asin(Math.max(-1, Math.min(1, yawRatio * 2.5))) * (180 / Math.PI);

  const noseForehead = dist2d(noseTip, forehead);
  const noseChin = dist2d(noseTip, chin);
  const totalVert = noseForehead + noseChin;
  const pitchRatio = totalVert > 0.001 ? (noseForehead - noseChin) / totalVert : 0;
  const pitchDeg = pitchRatio * 120;

  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const rollDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  return { yaw: yawDeg, pitch: pitchDeg, roll: rollDeg };
}
