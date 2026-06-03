local s = redis.call('get', KEYS[1])
local g = redis.call('get', KEYS[2])
local ofertaExiste = redis.call('exists', KEYS[3])
local ofertaLock = redis.call('get', KEYS[4])

if s == 'aceptado' then
    if g == ARGV[1] then
        return 'OK'
    else
        return 'YA_TOMADO'
    end
end

if s ~= 'ofertando' then
    return 'ESTADO_INVALIDO'
end

if ofertaExiste == 0 then
    return 'OFERTA_EXPIRADA'
end

if ofertaLock ~= ARGV[2] then
    return 'OFERTA_INVALIDA'
end

redis.call('set', KEYS[1], 'aceptado', 'EX', 600)
redis.call('set', KEYS[2], ARGV[1], 'EX', 600)

return 'OK'
