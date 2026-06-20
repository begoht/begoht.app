import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260620-map-rotation";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
