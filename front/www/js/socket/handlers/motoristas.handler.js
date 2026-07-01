import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260701-follow-zoom";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
