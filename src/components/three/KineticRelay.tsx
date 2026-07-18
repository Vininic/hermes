import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";

/** react-three-fiber's own container measurement can go stale on first
 *  mount — the canvas locks in the browser's 300×150 default and only
 *  self-corrects on a later resize event. Proven fix: dispatching a real
 *  `resize` event on `window` makes react-three-fiber's internal
 *  ResizeObserver re-measure and correct itself immediately (same fix
 *  applied to Chiron's Tome and Olympus' Column after it was confirmed
 *  there). Also re-fires once fonts finish loading. */
function ResizeFix() {
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event("resize"));
    const raf = requestAnimationFrame(fire);
    document.fonts?.ready?.then(fire).catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}

function RelayCore() {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.4) * 0.15;
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <group ref={meshRef}>
      {/* Diamond core */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color="#3EB8CC" metalness={1} roughness={0.2} />
      </mesh>

      {/* Inner glow */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color="#5FD9ED" metalness={0.5} roughness={0.3} transparent opacity={0.6} />
      </mesh>

      {/* Wing feathers — left. Sized to stay inside the camera frustum: at
          this camera distance/fov the previous 2.2+0.9=3.1 unit reach
          overshot the ~2.3-unit visible half-width, clipping the wingtips
          at the card edge. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.4, 0.55, 0]} rotation={[0, 0, side * 0.3]}>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[side * 1.4, -0.55, 0]} rotation={[0, 0, side * -0.3]}>
            <boxGeometry args={[1.2, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Signal ticks */}
      {[-1, 1].map((side) => (
        <mesh key={`tick-${side}`} position={[0, side * 1.7, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.08]} />
          <meshStandardMaterial color="#3EB8CC" metalness={0.6} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function PulseRings() {
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 1.5) * 0.08;
    ringRef.current.scale.set(scale, scale, scale);
    (ringRef.current.material as MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 1.5) * 0.15;
  });

  return (
    <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.7, 2.0, 64]} />
      <meshStandardMaterial color="#3EB8CC" transparent opacity={0.3} side={2} />
    </mesh>
  );
}

export default function KineticRelay() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <ResizeFix />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, 3]} intensity={0.3} />
      <RelayCore />
      <PulseRings />
      <ContactShadows position={[0, -2.5, 0]} opacity={0.3} scale={6} blur={3} />
      <Environment preset="city" />
    </Canvas>
  );
}
