import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260620-car-navigation";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
