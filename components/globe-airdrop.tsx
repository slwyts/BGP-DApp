"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Gift } from "lucide-react";
import { Globe } from "@/components/ui/globe";
import { centerLatLon } from "@/components/ui/globe-utils";
import { useLocale } from "@/components/locale-provider";
import { useTheme } from "next-themes";

const AIRDROP_CONFIG = {
  circleTimeSeconds: 120,
  airdropIntervalSeconds: 1800, // 30 minutes
};

const LOCUS_CONFIG = {
  radius: 41,
  strokeWidth: 1,
  frontOpacity: 0.5,
  backOpacity: 0,
  segments: 75,
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
  const [countdown, setCountdown] = useState(
    AIRDROP_CONFIG.airdropIntervalSeconds,
  );
  const [planePosition] = useState({ x: 50, y: 50 });

  // Generate static locus circle matching globe's tilt and rotation with vertical inclination
  const locusPoints = useMemo(() => {
    const theta = 0.3; // globe tilt angle
    const phi = (90 * Math.PI) / 180; // globe rotation angle
    const incline = 0.1; // vertical inclination angle
    const cx = 50;
    const cy = 50;
    const r = LOCUS_CONFIG.radius;
    const segments = LOCUS_CONFIG.segments;

    const points: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;

      // Create circle in 3D with vertical inclination
      const ux = Math.cos(t);
      const uy = Math.sin(t) * Math.sin(incline); // add vertical component
      const uz = Math.sin(t) * Math.cos(incline);

      // Apply tilt (rotation around x-axis)
      const ux1 = ux;
      const uy1 = uy * Math.cos(theta) - uz * Math.sin(theta);
      const uz1 = uy * Math.sin(theta) + uz * Math.cos(theta);

      // Apply phi rotation (rotation around y-axis)
      const ux2 = ux1 * Math.cos(phi) + uz1 * Math.sin(phi);
      const uy2 = uy1;
      const uz2 = -ux1 * Math.sin(phi) + uz1 * Math.cos(phi);

      // Project to 2D
      const sx = cx + r * ux2;
      const sy = cy - r * uy2; // negative because SVG y-axis is inverted

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
  const planeAnimationStartRef = useRef<number>(0);
  const nextAirdropAtRef = useRef<number>(0);
  const dropPhiRef = useRef<number>(0);
  const globeTiltRef = useRef<number>(0.3);

  // Initialize planeAnimationStartRef once
  useEffect(() => {
    planeAnimationStartRef.current = Date.now();
  }, []);

  const handleRotationUpdate = useCallback((phi: number) => {
    globeRotationRef.current = phi;
  }, []);

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

  useEffect(() => {
    const now = Date.now();

    nextAirdropAtRef.current =
      now + AIRDROP_CONFIG.airdropIntervalSeconds * 1000;
    lastAirdropTimeRef.current = now;

    const interval = setInterval(() => {
      const nowTick = Date.now();
      const msLeft = nextAirdropAtRef.current - nowTick;

      setCountdown(Math.max(0, Math.ceil(msLeft / 1000)));

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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showGift]);

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-square">
        <Globe config={globeConfig} onRotationUpdate={handleRotationUpdate} />

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="locus-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.5" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {(() => {
            // Group continuous visible segments into polylines for constant width
            const visibleSegments: { points: { x: number; y: number; z: number }[]; opacity: number }[] = [];
            let currentSegment: { x: number; y: number; z: number }[] = [];
            let currentOpacity = LOCUS_CONFIG.frontOpacity;

            for (let i = 0; i < locusPoints.length; i++) {
              const p = locusPoints[i];
              const depth = p.z;
              const isVisible = depth > -0.3;
              const opacity = depth >= 0 ? LOCUS_CONFIG.frontOpacity : LOCUS_CONFIG.backOpacity;

              if (isVisible) {
                if (currentSegment.length === 0 || Math.abs(opacity - currentOpacity) < 0.1) {
                  currentSegment.push(p);
                  currentOpacity = opacity;
                } else {
                  if (currentSegment.length > 1) {
                    visibleSegments.push({ points: currentSegment, opacity: currentOpacity });
                  }
                  currentSegment = [p];
                  currentOpacity = opacity;
                }
              } else {
                if (currentSegment.length > 1) {
                  visibleSegments.push({ points: currentSegment, opacity: currentOpacity });
                }
                currentSegment = [];
              }
            }

            if (currentSegment.length > 1) {
              visibleSegments.push({ points: currentSegment, opacity: currentOpacity });
            }

            return visibleSegments.map((segment, idx) => {
              const pointsStr = segment.points.map(p => `${p.x},${p.y}`).join(' ');
              return (
                <g key={`locus-segment-${idx}`}>
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#ff8c00"
                    strokeOpacity={segment.opacity * 0.4}
                    strokeWidth={LOCUS_CONFIG.strokeWidth + 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#locus-glow)"
                  />
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#ff8c00"
                    strokeOpacity={segment.opacity}
                    strokeWidth={LOCUS_CONFIG.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            });
          })()}
        </svg>

        <motion.div
          className="absolute pointer-events-none z-30"
          style={{
            left: `${planePosition.x}%`,
            top: `${planePosition.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative">
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
          </div>
        </motion.div>

        {showGift && (
          <div
            key={`airdrop-${airdropKey}`}
            className="absolute pointer-events-none z-20"
            style={{
              left: `${planePosition.x}%`,
              top: `${planePosition.y + giftDropProgress * 3}%`,
              transform: `translate(-50%, -50%) scale(${1 - giftDropProgress * 0.5})`,
              opacity: 1 - giftDropProgress * 0.7,
            }}
          >
            <Gift
              className="text-primary drop-shadow-lg"
              size={28}
              strokeWidth={3}
            />
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {t("nextAirdrop")}:
          </span>
          <span className="text-lg font-bold text-primary">{countdown}s</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border text-center backdrop-blur-sm">
          <div className="text-2xl font-bold text-primary">
            {droppedMarkers.length}
          </div>
          <div className="text-xs text-muted-foreground">{t("airdrops")}</div>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center backdrop-blur-sm">
          <div className="text-2xl font-bold text-primary">1,250</div>
          <div className="text-xs text-muted-foreground">BGP</div>
        </div>
      </div>
    </div>
  );
}
