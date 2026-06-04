import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260604-jacmel-gps";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
