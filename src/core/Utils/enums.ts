export enum ReactionType {
  Haha = "haha",
  Love = "love",
  Like = "like",
  Care = "care",
  Sad = "sad",
  Angry = "angry",
}

export enum DatabaseNames {
  User = "users",
  Reels = "reels",
  ReelsReactions = "reels_reactions",
  ReelsComments = "reels_comments",
  Reels_comment_reaction = "reels_comments_reactions",
  Post = "posts",
  PostReactions = "post_reactions",
  PostComments = "post_comments",
  PostCommentReactions = "post_comment_reactions",
  stories = "stories",
  story_reactions = "story_reactions",
  friendships = "friendships",
  conversations = "conversations",
  messages = "messages",
  userStats = "userstats",
  history = "histories",
  followers = "followers",
  Admin = "admins",
  Gifts = "gifts",
  PortalUsers = "portal_users",
}

export enum ReelStatus {
  active = "active",
  inactive = "inactive",
}

export enum UserStatus {
  active = "active",
  inactive = "inactive",
}

export enum CloudinaryFolder {
  Reels = "reels",
  UserPRofile = "user_profiles",
  PostImages = "post_images",
  PostVideos = "post_videos",
  userStories = "user_stories",
  messageImages = "message_photos",
  messageVideos = "message_videos",
  giftAssets = "gift_assets",
}

export enum FriendshipStatus {
  accepted = "accepted",
  rejected = "rejected",
  pending = "pending",
}

export enum RequestTypes {
  sent = "sent",
  recieved = "recieved",
}

export enum SocketChannels {
  newMessage = "newMessage",
  newConversation = "newConversation",

  createRoom = "create-room",
  deleteRoom = "delete-room",
  roomList = "room-list",
  joinRoom = "join-room",
  joinCallReq = "join-call-request",

  joinCallReqList = "join-call-request-list",
  acceptCallReq = "accept-call-request",
  broadcasterList = "broadcaster-list",
  removeBroadCaster = "remove-broadcaster",
  leaveRoom = "leave-room",
  userJoined = "user-joined",
  userLeft = "user-left",
  banUser = "ban-user",
  banned = "banned",
  userBanned = "user-banned",
  roomClosed = "room-closed",
  inviteUser = "invite-user",
  invited = "invited",
  getRooms = "get-rooms",
  error = "error-message",

  sendGift = "sent-gift",
}

export enum RoomTypes {
  live = "live",
  pk = "pk",
  audio = "audio",
  party = "party",
}

export enum GiftTypes {
  rose = "rose",
  love = "love",
  car = "car",
}

export enum Gender {
  male = "male",
  female = "female",
  other = "other",
}

export enum ActivityZoneState {
  safe = "safe",
  temporaryBlock = "temp_block",
  permanentBlock = "permanent_block",
}

export enum UserActiveStatus {
  online = "Online",
  offline = "Offline",
}

export enum UserRoles {
  User = "user",
  Admin = "admin",
  Merchant = "merchant",
  Reseller = 're-seller',
  SubAdmin = 'sub-admin',
  Agency = "agency",
  Host = "host",
  CountryAdmin = "country-admin",
  countrySubAdmin = "country-sub-admin",
}

export enum AdminPowers {
  CoinDistribute = "coin-distributor",
  PromoteUser = "promote-user",
  UpdateUsers = "update-users",
  BlockUser = "block-user",
  DeviceBan = "device-ban",
  LiveRoomClose = "live-room-close",
  CreateUserAccount = "create-user-account"
}

export enum WhoCanTextMe {
  AllUsers = "all_users",
  MyFollowers = "my_followers",
  HighLevel = "high_level",
}

export enum WhoCanTextMeLevelTypes {
  UserLevel = "user_level",
  talentLevel = "talent_level",
}
