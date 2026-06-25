import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260625-map-instant";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
