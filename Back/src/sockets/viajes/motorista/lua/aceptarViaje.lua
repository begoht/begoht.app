local s = redis.call('get', KEYS[1])
local g = redis.call('get', KEYS[2])

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

redis.call('set', KEYS[1], 'aceptado', 'EX', 600)
redis.call('set', KEYS[2], ARGV[1], 'EX', 600)

return 'OK'