const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://USUARIO:CLAVE@BeGO.xriakv0.mongodb.net/BeGO?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Conectado correctamente a MongoDB Atlas");
  } catch (err) {
    console.error("Error de conexión:", err);
  } finally {
    await client.close();
  }
}

run();
