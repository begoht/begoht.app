import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260618-map-ref-reserve";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
