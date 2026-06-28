import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260628-light-map-locked";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
