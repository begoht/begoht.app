import { mostrarMotoristas } from "../../map/map.motorista.js";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};