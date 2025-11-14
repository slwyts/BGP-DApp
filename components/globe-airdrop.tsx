"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Gift } from "lucide-react";
import { Globe } from "@/components/ui/globe";
import { centerLatLon } from "@/components/ui/globe-utils";
import { useLocale } from "@/components/locale-provider";
import { useTheme } from "next-themes";
import { useInteractionStatus, useBlockTimestamp } from "@/lib/hooks/use-contracts";
import { useChainCountdown } from "@/lib/hooks/use-chain-countdown";

const AIRDROP_CONFIG = {
  circleTimeSeconds: 120,
  airdropIntervalSeconds: 1800, // 30 minutes
};

const LOCUS_CONFIG = {
  radius: 41,
  strokeWidth: 2.2,
  frontOpacity: 0.9,
  backOpacity: 0.9,
  segments: 360,
};

const calculateCenterCoordinates = (
  globeRotation: number,
  globeTilt: number,
) => {
  const [lat, lon] = centerLatLon(globeRotation, globeTilt);
  return { lat, lng: lon };
};

export function GlobeAirdrop() {
  const { t } = useLocale();
  const { theme } = useTheme();
  
  // 获取倒计时数据和区块链时间
  const { canInteract, nextSlotTime } = useInteractionStatus();
  const { timestamp: blockTimestamp } = useBlockTimestamp();
  const countdown = useChainCountdown({
    nextSlotTime,
    canInteract,
    blockTimestamp,
    enabled: !!nextSlotTime,
  });
  
  // 格式化倒计时显示 - HH:MM:SS 格式
  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    
    return `${hh}:${mm}:${ss}`;
  };
  
  // Plane position derives from current ring; no separate state

  // Track globe rotation for synchronizing the ring
  const [ringPhi, setRingPhi] = useState(0);

  // Keep a continuous, unwrapped angle for the plane on the ring
  const planeTRef = useRef(0);
  // Motion values for plane position (percent values)
  const planeX = useMotionValue(50);
  const planeY = useMotionValue(50);
  const leftMV = useTransform(planeX, (v) => `${v}%`);
  const topMV = useTransform(planeY, (v) => `${v}%`);

  const unwrapAngle = (angle: number, prev: number) => {
    let a = angle;
    const twoPi = Math.PI * 2;
    while (a - prev > Math.PI) a -= twoPi;
    while (prev - a > Math.PI) a += twoPi;
    return a;
  };

  // Front-most position angle on the ring for given phi/theta
  const frontAngle = (phi: number, theta: number) => {
    const A = Math.cos(theta) * Math.cos(phi);
    const B = -Math.sin(phi);
    return Math.atan2(A, B);
  };

  // Project a single ring parameter t to 2D screen point
  const projectRingPoint = useCallback(
    (t: number, phi: number, theta: number) => {
      const cx = 50;
      const cy = 50;
      const r = LOCUS_CONFIG.radius;

      const ux = Math.cos(t);
      const uy = 0;
      const uz = Math.sin(t);

      const ux1 = ux;
      const uy1 = uy * Math.cos(theta) - uz * Math.sin(theta);
      const uz1 = uy * Math.sin(theta) + uz * Math.cos(theta);

      const ux2 = ux1 * Math.cos(phi) + uz1 * Math.sin(phi);
      const uy2 = uy1;
      const uz2 = -ux1 * Math.sin(phi) + uz1 * Math.cos(phi);

      const sx = cx + r * ux2;
      const sy = cy - r * uy2;
      return { x: sx, y: sy, z: uz2 };
    },
    [],
  );

  // Compute locus (equatorial) ring points for a given rotation and tilt
  const computeLocusPoints = useCallback((phi: number, theta: number) => {
    const cx = 50;
    const cy = 50;
    const r = LOCUS_CONFIG.radius;
    const segments = LOCUS_CONFIG.segments;

    const points: { x: number; y: number; z: number }[] = [];

    // Base equatorial circle in XZ-plane: (cos t, 0, sin t)
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const ux = Math.cos(t);
      const uy = 0;
      const uz = Math.sin(t);

      // Rotate around X by theta (tilt)
      const ux1 = ux;
      const uy1 = uy * Math.cos(theta) - uz * Math.sin(theta);
      const uz1 = uy * Math.sin(theta) + uz * Math.cos(theta);

      // Rotate around Y by phi (spin)
      const ux2 = ux1 * Math.cos(phi) + uz1 * Math.sin(phi);
      const uy2 = uy1;
      const uz2 = -ux1 * Math.sin(phi) + uz1 * Math.cos(phi);

      // Project to 2D (orthographic)
      const sx = cx + r * ux2;
      const sy = cy - r * uy2; // SVG y-axis inverted

      points.push({ x: sx, y: sy, z: uz2 });
    }

    return points;
  }, []);

  const [airdropKey, setAirdropKey] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [giftDropProgress, setGiftDropProgress] = useState(0);
  const [droppedMarkers, setDroppedMarkers] = useState<
    Array<{ location: [number, number]; size: number }>
  >([]);
  const animationRef = useRef<number>(0);
  const dropStartTimeRef = useRef<number>(0);
  const lastAirdropTimeRef = useRef<number>(0);
  const globeRotationRef = useRef<number>(0);
  const nextAirdropAtRef = useRef<number>(0);
  const dropPhiRef = useRef<number>(0);
  const globeTiltRef = useRef<number>(0.3);

  const handleRotationUpdate = useCallback(
    (phi: number) => {
      globeRotationRef.current = phi;
      setRingPhi(phi);
      // Update plane angle smoothly to the analytic front-most point
      const tFront = frontAngle(phi, globeTiltRef.current);
      planeTRef.current = unwrapAngle(tFront, planeTRef.current);
      const p = projectRingPoint(planeTRef.current, phi, globeTiltRef.current);
      planeX.set(p.x);
      planeY.set(p.y);
    },
    [projectRingPoint, planeX, planeY],
  );

  const globeConfig = useMemo(() => {
    const isDark = theme === "dark";
    return {
      width: 800,
      height: 800,
      onRender: () => {},
      devicePixelRatio: 2,
      phi: (-30 * Math.PI) / 180,
      theta: 0.3,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: isDark ? 1.5 : 6,
      baseColor: (isDark ? [0.3, 0.3, 0.3] : [0.9, 0.9, 0.9]) as [
        number,
        number,
        number,
      ],
      markerColor: [0.85, 0.65, 0.2] as [number, number, number],
      glowColor: [0.85, 0.65, 0.2] as [number, number, number],
      markers: [...droppedMarkers],
      rotationSpeed: AIRDROP_CONFIG.circleTimeSeconds,
    };
  }, [droppedMarkers, theme]);

  useEffect(() => {
    globeTiltRef.current = (globeConfig.theta as number) ?? 0.3;
  }, [globeConfig.theta]);

  // Stable tilt value for render-time computations (avoid reading refs in render)
  const renderTilt = (globeConfig.theta as number) ?? 0.3;

  // Precompute locus points for current rotation/tilt for use in render
  const locusPoints = useMemo(
    () => computeLocusPoints(ringPhi, renderTilt),
    [computeLocusPoints, ringPhi, renderTilt],
  );

  // 原有的空投动画效果保持不变
  useEffect(() => {
    const now = Date.now();

    nextAirdropAtRef.current =
      now + AIRDROP_CONFIG.airdropIntervalSeconds * 1000;
    lastAirdropTimeRef.current = now;

    const interval = setInterval(() => {
      const nowTick = Date.now();
      const msLeft = nextAirdropAtRef.current - nowTick;

      // 移除原来的倒计时更新，改用上面的真实数据
      if (msLeft <= 0) {
        do {
          nextAirdropAtRef.current +=
            AIRDROP_CONFIG.airdropIntervalSeconds * 1000;
        } while (nextAirdropAtRef.current <= nowTick);

        setShowGift(true);
        setAirdropKey((prev) => prev + 1);
        dropStartTimeRef.current = nowTick;
        lastAirdropTimeRef.current = nowTick;

        dropPhiRef.current = globeRotationRef.current;

        setTimeout(() => {
          const landingRotation = dropPhiRef.current;
          const landingCoords = calculateCenterCoordinates(
            landingRotation,
            globeTiltRef.current,
          );

          setDroppedMarkers((prev) => {
            const next = [
              ...prev,
              {
                location: [landingCoords.lat, landingCoords.lng] as [
                  number,
                  number,
                ],
                size: 0.05,
              },
            ];

            return next.slice(-4);
          });

          setShowGift(false);
          setGiftDropProgress(0);
        }, 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();

      if (showGift && dropStartTimeRef.current > 0) {
        const dropElapsed = (now - dropStartTimeRef.current) / 1000;
        const progress = Math.min(dropElapsed / 1.0, 1);
        setGiftDropProgress(progress);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [showGift]);

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-square">
        {/* Back ring behind the globe */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          shapeRendering="geometricPrecision"
          style={{ overflow: "visible" }}
        >
          {(() => {
            // Compute seamless front/back polylines with seam interpolation
            const pts = locusPoints;
            const n = pts.length;
            const backSegments: {
              points: { x: number; y: number; z: number }[];
            }[] = [];
            let currentBack: { x: number; y: number; z: number }[] = [];
            let inBack = false;

            const pushBack = () => {
              if (currentBack.length > 1)
                backSegments.push({ points: currentBack });
              currentBack = [];
            };

            for (let i = 0; i < n; i++) {
              const a = pts[i];
              const b = pts[(i + 1) % n];
              const aBack = a.z < 0;
              const bBack = b.z < 0;

              if (aBack && !inBack) {
                // starting a back segment
                inBack = true;
                currentBack.push(a);
              } else if (aBack && inBack) {
                currentBack.push(a);
              } else if (!aBack && inBack) {
                // we were in back but 'a' is not, ensure we include it only at seam
              }

              // Handle crossing
              if (aBack !== bBack) {
                const alpha = a.z / (a.z - b.z); // where z=0 between a and b
                const seam = {
                  x: a.x + (b.x - a.x) * alpha,
                  y: a.y + (b.y - a.y) * alpha,
                  z: 0,
                };

                if (inBack) {
                  // close back at seam
                  currentBack.push(seam);
                  pushBack();
                  inBack = false;
                } else {
                  // start back at seam
                  inBack = true;
                  currentBack.push(seam);
                }
              }
            }

            // Wrap-up if still in back
            if (inBack) pushBack();

            return backSegments.map((segment, idx) => (
              <polyline
                key={`locus-back-${idx}`}
                points={segment.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ff8c00"
                strokeOpacity={LOCUS_CONFIG.backOpacity}
                strokeWidth={LOCUS_CONFIG.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
            ));
          })()}
        </svg>

        {/* Globe canvas with slight transparency so back ring is visible */}
        <Globe
          className="z-10 opacity-80"
          config={globeConfig}
          onRotationUpdate={handleRotationUpdate}
        />

        {/* Front ring above the globe */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          shapeRendering="geometricPrecision"
          style={{ overflow: "visible" }}
        >
          {(() => {
            // Compute seamless front polylines with seam interpolation
            const pts = locusPoints;
            const n = pts.length;
            const frontSegments: {
              points: { x: number; y: number; z: number }[];
            }[] = [];
            let currentFront: { x: number; y: number; z: number }[] = [];
            let inFront = false;

            const pushFront = () => {
              if (currentFront.length > 1)
                frontSegments.push({ points: currentFront });
              currentFront = [];
            };

            for (let i = 0; i < n; i++) {
              const a = pts[i];
              const b = pts[(i + 1) % n];
              const aFront = a.z >= 0;
              const bFront = b.z >= 0;

              if (aFront && !inFront) {
                inFront = true;
                currentFront.push(a);
              } else if (aFront && inFront) {
                currentFront.push(a);
              }

              if (aFront !== bFront) {
                const alpha = a.z / (a.z - b.z);
                const seam = {
                  x: a.x + (b.x - a.x) * alpha,
                  y: a.y + (b.y - a.y) * alpha,
                  z: 0,
                };

                if (inFront) {
                  currentFront.push(seam);
                  pushFront();
                  inFront = false;
                } else {
                  inFront = true;
                  currentFront.push(seam);
                }
              }
            }

            if (inFront) pushFront();

            return frontSegments.map((segment, idx) => (
              <polyline
                key={`locus-front-${idx}`}
                points={segment.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#ff8c00"
                strokeOpacity={LOCUS_CONFIG.frontOpacity}
                strokeWidth={LOCUS_CONFIG.strokeWidth + 0.05}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
            ));
          })()}
        </svg>

        {/* Plane positioned by springs and bobbing subtly */}
        <motion.div
          className="absolute pointer-events-none z-30"
          style={{
            left: leftMV,
            top: topMV,
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.div
            animate={{ y: [-2, 2] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          >
            <div
              className="w-16 h-16 flex items-center justify-center"
              style={{
                filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
                transform: "rotate(290deg)",
              }}
            >
              <svg
                className="w-12 h-12 text-primary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
          </motion.div>
        </motion.div>

        {showGift && (
          <motion.div
            key={`airdrop-${airdropKey}`}
            className="absolute pointer-events-none z-20"
            style={{
              left: leftMV,
              top: topMV,
              transform: `translate(-50%, -50%) scale(${1 - giftDropProgress * 0.5})`,
            }}
            animate={{ y: giftDropProgress * 14 }}
            transition={{ ease: "linear", duration: 0 }}
          >
            <Gift
              className="text-primary drop-shadow-lg"
              size={28}
              strokeWidth={3}
              style={{ opacity: 1 - giftDropProgress * 0.7 }}
            />
          </motion.div>
        )}
      </div>

      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {countdown > 0 ? t("nextAirdrop") : t("canClaim")}:
          </span>
          <span className="text-lg font-bold text-primary">{formatCountdown(countdown)}</span>
        </div>
      </div>
    </div>
  );
}
