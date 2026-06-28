import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260628-map-locked-motion";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
