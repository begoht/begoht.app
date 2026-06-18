import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260618-passenger-map-full";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
