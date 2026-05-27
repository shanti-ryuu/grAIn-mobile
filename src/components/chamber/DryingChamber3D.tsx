import { OrbitControls } from "@react-three/drei/native";
import { Canvas } from "@react-three/fiber/native";

import { AirflowParticles } from "@/components/chamber/AirflowParticles";
import { ChamberBox } from "@/components/chamber/ChamberBox";
import type { ChamberTelemetry } from "@/components/chamber/chamberTypes";
import { FanBlade } from "@/components/chamber/FanBlade";
import { GrainBed } from "@/components/chamber/GrainBed";
import { HeaterElement } from "@/components/chamber/HeaterElement";
import { MoistureVapor } from "@/components/chamber/MoistureVapor";
import { TemperatureGlow } from "@/components/chamber/TemperatureGlow";

export function DryingChamber3D(props: ChamberTelemetry) {
  const fanState = props.fan1State === "ON" || props.fan2State === "ON" ? "ON" : "OFF";

  return (
    <Canvas
      camera={{ position: [5, 4, 5], fov: 45 }}
      frameloop={props.isRunning ? "always" : "demand"}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
      }}
      style={{ flex: 1 }}
    >
      <ambientLight color="#FFFFFF" intensity={0.6} />
      <directionalLight intensity={0.8} position={[5, 8, 5]} />
      <pointLight color="#E8F5E9" intensity={0.4} position={[0, 4, 0]} />
      <TemperatureGlow temperature={props.temperature} isRunning={props.isRunning} />
      <ChamberBox />
      <GrainBed moisture={props.moisture} weight={props.weight} isRunning={props.isRunning} />
      <FanBlade fanSpeed={props.fanSpeed} fanState={fanState} />
      <HeaterElement heaterState={props.heaterState} temperature={props.temperature} />
      <AirflowParticles fanSpeed={props.fanSpeed} isRunning={props.isRunning && fanState === "ON"} temperature={props.temperature} />
      <MoistureVapor moisture={props.moisture} isRunning={props.isRunning} />
      <OrbitControls
        autoRotate={props.isRunning}
        autoRotateSpeed={0.3}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 4}
      />
    </Canvas>
  );
}
