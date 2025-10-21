// const parseCoin = (value: string) => {
//   if (!value) return 0; // handle empty strings
//   value = value.toLowerCase().trim();
//   if (value.endsWith("k")) {
//     return parseFloat(value.replace("k", "")) * 1000;
//   } else {
//     return parseFloat(value);
//   }
// };


// const nearestFiftyMultiple = (num: number) => {
//   return Math.floor(num / 50000) * 50000;
// }

// router.route("/temp").post(async (req: Request, res: Response) => {
//   let userJson: Record<string, any>[] = [];
//   let successEmail: { data: string; msg: string }[] = [];
//   let failedEmail: { data: string; error: string }[] = [];
//   for (let i = 0; i < tempConst.length; i++) {
//     const user = tempConst[i];
//     userJson.push({
//       ...user,
//       main_coin: parseCoin(user.main_coin),
//       reward_coin: parseCoin(user.reward_coin),
//     });
//   }

//   for (let i = 0; i < userJson.length; i++) {
//     const user = userJson[i];
//     const dbData = await User.findOne({ email: user.user_email });
//     if (!dbData) {
//       failedEmail.push({
//         data: user.user_email,
//         error: "User not found in the db",
//       });
//       continue;
//     }
//     const dbUserStats = await UserStats.findOne({
//       userId: dbData?._id,
//     });

//     if (!dbUserStats) {
//       failedEmail.push({
//         data: user.user_email,
//         error: "User stats not found in the db",
//       });
//       continue;
//     }
//     const totalCoin = user.main_coin + user.reward_coin;
//     const fiftyMultiple = nearestFiftyMultiple(totalCoin);
//     if (dbUserStats!.diamonds! < fiftyMultiple) {
//       failedEmail.push({
//         data: user.user_email,
//         error: `Insufficient diamonds. User has ${
//           dbUserStats!.diamonds
//         } but needs ${fiftyMultiple}`,
//       });
//       continue;
//     }

//     const res = await UserStats.findByIdAndUpdate(dbUserStats._id, {$inc: { diamonds: -fiftyMultiple }}, { new: true });
//     if(!res) {
//       failedEmail.push({
//         data: user.user_email,
//         error: "Failed to update user stats",
//       });
//       continue;
//     }

//     successEmail.push({ data: user.user_email, msg: `Current Diamonds -> ${res.diamonds}, Deducted Amount -> ${fiftyMultiple}, Requested Diamonds -> ${totalCoin}` });
//   }

//   res.send({ success: successEmail, failed: failedEmail });
// });
