import dotenv from "dotenv";
import { connectDatabase } from "./db/mongoose";
import { PORT } from "./config";
import app from "./app";

dotenv.config();
console.log(process.env.PORT);

// Start Server
async function start() {
  // database connection
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
  });
}
start().catch((error) => console.log(error));
