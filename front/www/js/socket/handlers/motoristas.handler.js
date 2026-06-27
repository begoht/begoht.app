import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260627-map-rotate";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
