module.exports = (data = {}) => {
    let lat = parseFloat(data.lat);
    let lng = parseFloat(data.lng);

    if (isNaN(lat)) lat = null;
    if (isNaN(lng)) lng = null;

    return { lat, lng };
};