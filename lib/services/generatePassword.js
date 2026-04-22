const self = module.exports;

self.generatePassword = (length = 12) => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%&*";
  const allChars = lowercase + uppercase + numbers + special;

  let availableChars = allChars.split("");
  let password = "";

  const getRandomChar = (chars) => {
    const index = Math.floor(Math.random() * chars.length);
    const char = chars[index];
    availableChars = availableChars.filter((c) => c !== char);
    return char;
  };

  password += getRandomChar(
    lowercase.split("").filter((c) => availableChars.includes(c)),
  );
  password += getRandomChar(
    uppercase.split("").filter((c) => availableChars.includes(c)),
  );
  password += getRandomChar(
    numbers.split("").filter((c) => availableChars.includes(c)),
  );
  password += getRandomChar(
    special.split("").filter((c) => availableChars.includes(c)),
  );

  for (let i = password.length; i < length; i++) {
    if (availableChars.length === 0) break;
    const index = Math.floor(Math.random() * availableChars.length);
    password += availableChars[index];
    availableChars.splice(index, 1);
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};
