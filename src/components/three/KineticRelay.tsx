import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";
import { useOutbox } from "@/lib/outbox/store";
import { useFlowsDocument } from "@/lib/flows/store";
import { getEngineStatus } from "@/lib/flows/service";

/** react-three-fiber's own container measurement can go stale on first
 *  mount — the canvas locks in the browser's 300×150 default. The previous
 *  fix (dispatching a `window` `resize` event from a mount effect) worked
 *  when tested by hand from a devtools console, but confirmed live here —
 *  under a real, non-zero viewport, with diagnostic markers proving the
 *  dispatch itself ran — it did not actually correct the canvas. Direct DOM
 *  inspection showed why: the wrapper div react-three-fiber renders around
 *  the `<canvas>` was already correctly sized (929×352, matching the real
 *  container) from the very first paint — it's not a stale-measurement
 *  problem, it's that the `<canvas>` element's own backing-store size
 *  (`canvas.width/height`, distinct from its CSS size) never gets told to
 *  match. So this doesn't route through `window`'s resize listener at all:
 *  it observes the real wrapper directly with a `ResizeObserver` and calls
 *  `gl.setSize()` itself, which needs no external event to arrive at the
 *  right time — the standard, documented approach for driving r3f's canvas
 *  size imperatively instead of relying on its own auto-sizing. */
function ResizeFix() {
  const { gl, camera } = useThree();
  useEffect(() => {
    const target = gl.domElement.parentElement;
    if (!target) return;

    const apply = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      gl.setSize(width, height);
      if ("aspect" in camera) {
        (camera as PerspectiveCamera).aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };

    const rect = target.getBoundingClientRect();
    apply(rect.width, rect.height);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, [gl, camera]);
  return null;
}

/** The core diamond + wings + signal ticks. `online` (the delivery engine's
 *  own heartbeat, same signal the Dashboard's status pill reads) sets the
 *  baseline liveliness — rotation speed, core glow, ring brightness — and
 *  `pending` (real outbox queue depth) makes the two signal ticks actively
 *  blink, independent of engine status, since "messages are waiting" is
 *  true regardless of whether the engine's heartbeat happens to be fresh.
 *
 *  Calibrated so the idle/no-data state (true for almost every first-time
 *  visitor, since this sits in the Landing hero) still reads as a
 *  deliberate, premium calm rather than a broken or degraded one — "online"
 *  adds a noticeably livelier boost on top of that baseline for anyone
 *  who's actually loaded demo data or has a live account, rather than being
 *  the difference between "off" and "on". */
function RelayCore({ online, pending }: { online: boolean; pending: number }) {
  const meshRef = useRef<Mesh>(null);
  const tickRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const spin = online ? 0.4 : 0.3;
      meshRef.current.rotation.x = Math.sin(t * spin) * 0.15;
      meshRef.current.rotation.y += online ? 0.005 : 0.0035;
    }
    const active = pending > 0;
    tickRefs.current.forEach((tick, i) => {
      if (!tick) return;
      const mat = tick.material as MeshStandardMaterial;
      if (active) {
        const rate = 2.2 + Math.min(pending, 6) * 0.35;
        const phase = i * Math.PI;
        mat.emissiveIntensity = 0.35 + (Math.sin(t * rate + phase) * 0.5 + 0.5) * 0.9;
      } else {
        mat.emissiveIntensity = online ? 0.22 : 0.1;
      }
    });
  });

  return (
    <group ref={meshRef}>
      {/* Diamond core */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#3EB8CC" metalness={1} roughness={0.2} emissive="#3EB8CC" emissiveIntensity={online ? 0.45 : 0.22} />
      </mesh>

      {/* Inner glow */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color="#5FD9ED" metalness={0.5} roughness={0.3} transparent opacity={online ? 0.6 : 0.42} />
      </mesh>

      {/* Wing feathers — left/right, sized to stay inside the camera frustum
          (see 2026-07-18 fix: previous 2.2+0.9 reach overshot the visible
          half-width at this camera distance). */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.4, 0.55, 0]} rotation={[0, 0, side * 0.3]}>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} transparent opacity={online ? 1 : 0.7} />
          </mesh>
          <mesh position={[side * 1.4, -0.55, 0]} rotation={[0, 0, side * -0.3]}>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} transparent opacity={online ? 1 : 0.7} />
          </mesh>
        </group>
      ))}

      {/* Signal ticks — blink when there's a real pending queue, sit at a
          steady dim glow otherwise. */}
      {[-1, 1].map((side, i) => (
        <mesh key={`tick-${side}`} ref={(el) => { tickRefs.current[i] = el; }} position={[0, side * 1.7, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.08]} />
          <meshStandardMaterial color="#3EB8CC" metalness={0.6} roughness={0.2} emissive="#3EB8CC" emissiveIntensity={0.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function PulseRings({ online }: { online: boolean }) {
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const speed = online ? 1.5 : 1.0;
    const amp = online ? 0.08 : 0.05;
    const scale = 1 + Math.sin(t * speed) * amp;
    ringRef.current.scale.set(scale, scale, scale);
    const baseOpacity = online ? 0.3 : 0.2;
    const swing = online ? 0.15 : 0.08;
    (ringRef.current.material as MeshStandardMaterial).opacity = baseOpacity + Math.sin(t * speed) * swing;
  });

  return (
    <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.7, 2.0, 64]} />
      <meshStandardMaterial color="#3EB8CC" transparent opacity={0.3} side={2} />
    </mesh>
  );
}

export default function KineticRelay() {
  // Real signal, not decoration: the same engine heartbeat the Dashboard's
  // "Online/Offline" pill reads, and the real outbox pending count. Both
  // hooks are safe here even outside the app shell (Landing/Login) —
  // useOutbox() has a Provider at the app root and useFlowsDocument() reads
  // localStorage directly with no Provider needed.
  const { doc } = useOutbox();
  const flowsDoc = useFlowsDocument();
  const { online } = getEngineStatus(flowsDoc);
  const pending = doc.messages.filter((m) => m.status === "pending").length;

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <ResizeFix />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, 3]} intensity={0.3} />
      <RelayCore online={online} pending={pending} />
      <PulseRings online={online} />
      <ContactShadows position={[0, -2.5, 0]} opacity={0.3} scale={6} blur={3} />
      <Environment preset="city" />
    </Canvas>
  );
}
