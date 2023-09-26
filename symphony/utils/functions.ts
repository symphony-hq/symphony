export const encodeFunctionName = (name: string): string => {
  return name.replace(".", "-");
};

export const decodeFunctionName = (name: string): string => {
  return name.replace("-", ".");
};
