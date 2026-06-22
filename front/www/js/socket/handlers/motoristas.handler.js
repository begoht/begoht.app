import { mostrarMotoristas } from "../../map/map.motorista.js?v=20260621-route-moto";

export const handleMotoristas = (motoristas) => {
  if (Array.isArray(motoristas)) mostrarMotoristas(motoristas);
};
