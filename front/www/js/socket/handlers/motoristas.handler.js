import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260603-proximity-alert";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
