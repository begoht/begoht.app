import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260619-map-hotfix";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
