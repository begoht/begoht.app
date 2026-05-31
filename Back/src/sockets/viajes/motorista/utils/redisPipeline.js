module.exports = async (pipeline) => {
    if (!pipeline) return [];

    const result = await pipeline.exec();

    return result || [];
};