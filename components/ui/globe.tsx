"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import createGlobe, { type COBEOptions } from "cobe";

import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 1.5,
  baseColor: [0.3, 0.3, 0.3],
  markerColor: [0.85, 0.65, 0.2],
  glowColor: [0.85, 0.65, 0.2],
  markers: [],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
  onRotationUpdate,
}: {
  className?: string;
  config?: COBEOptions & { rotationSpeed?: number };
  onRotationUpdate?: (phi: number) => void;
}) {
  const { theme } = useTheme();
  const initialPhiRef = useRef(config.phi || 0);
  const phiRef = useRef(config.phi || 0);
  const rotationStepRef = useRef<number>(0.005);
  const widthRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const markersRef = useRef(config.markers);
  const renderLoopActiveRef = useRef(true);

  useLayoutEffect(() => {
    markersRef.current = config.markers;

    renderLoopActiveRef.current = true;

    if (globeRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.opacity = canvas.style.opacity; // Force repaint
      }
    }
  }, [config.markers]);

  // Update rotation step dynamically when config.rotationSpeed changes
  useEffect(() => {
    if (typeof config.rotationSpeed === "number") {
      const secondsPerRotation = config.rotationSpeed;

      rotationStepRef.current =
        secondsPerRotation > 0 ? (2 * Math.PI) / secondsPerRotation / 60 : 0;
    } else {
      rotationStepRef.current = 0.005;
    }
  }, [config.rotationSpeed]);

  // Allow updating the base phi dynamically for debugging
  useEffect(() => {
    if (typeof config.phi === "number") {
      phiRef.current = config.phi;
    }
  }, [config.phi]);

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current && canvasRef.current.offsetWidth) {
        widthRef.current = canvasRef.current.offsetWidth;
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    const isDark = theme === "dark";

    phiRef.current = initialPhiRef.current;

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      dark: isDark ? 1 : 0,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      // Initialize with current markers
      markers: config.markers || [],
      onRender: (state) => {
        // Apply simple autorotation each frame
        phiRef.current += rotationStepRef.current;
        state.phi = phiRef.current;
        state.theta = (config.theta as number) ?? 0.3;
        state.width = widthRef.current * 2;
        state.height = widthRef.current * 2;

        // Update markers dynamically from the latest ref
        state.markers = markersRef.current || [];

        onRotationUpdate?.(state.phi);
      },
    });

    globeRef.current = globe;

    setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0);
    return () => {
      globe.destroy();
      globeRef.current = null;
      window.removeEventListener("resize", onResize);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, onRotationUpdate]);

  return (
    <div className={cn("absolute inset-0 w-full h-full", className)}>
      <canvas
        className="w-full h-full opacity-0 transition-opacity duration-500"
        ref={canvasRef}
        style={{ cursor: "default" }}
      />
    </div>
  );
}
