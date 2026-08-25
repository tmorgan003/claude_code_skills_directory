import { runRefresh } from "../lib/refresh";

runRefresh()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === "failed" ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
