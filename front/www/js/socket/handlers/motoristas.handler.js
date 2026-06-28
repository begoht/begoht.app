import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260628-map-single-layer";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
