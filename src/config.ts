import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  fs.writeFileSync(
    getConfigFilePath(),
    JSON.stringify(rawConfig)
  );
}

function validateConfig(rawConfig: any): Config {
  if (typeof rawConfig.db_url !== "string") {
    throw new Error("db_url must be a string");
  }

  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("current_user_name must be a string");
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}

export function setUser(userName: string): void {
  const cfg = readConfig();

  const newConfig: Config = {
    dbUrl: cfg.dbUrl,
    currentUserName: userName,
  };

  writeConfig(newConfig);
}

export function readConfig(): Config {
  const configFilePath = getConfigFilePath();

  const fileContents = fs.readFileSync(configFilePath, "utf-8");
  const rawConfig = JSON.parse(fileContents);

  return validateConfig(rawConfig);
}
