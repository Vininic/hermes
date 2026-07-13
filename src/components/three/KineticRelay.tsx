import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";

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

      {/* Wing feathers — left */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 2.2, 0.6, 0]} rotation={[0, 0, side * 0.3]}>
            <boxGeometry args={[1.8, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[side * 2.2, -0.6, 0]} rotation={[0, 0, side * -0.3]}>
            <boxGeometry args={[1.8, 0.08, 0.08]} />
            <meshStandardMaterial color="#3EB8CC" metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Signal ticks */}
      {[-1, 1].map((side) => (
        <mesh key={`tick-${side}`} position={[0, side * 2, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
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
      <ringGeometry args={[2.2, 2.5, 64]} />
      <meshStandardMaterial color="#3EB8CC" transparent opacity={0.3} side={2} />
    </mesh>
  );
}

export default function KineticRelay() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
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
