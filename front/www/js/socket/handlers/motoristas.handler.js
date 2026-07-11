import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260710-live-driver";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
