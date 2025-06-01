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
    story_reactions= "story_reactions", 

    friendships = "friendships",

    conversations = "conversations",
    messages = "messages"

}

export enum ReelStatus {
  active = "active",
  inactive= "inactive",
}

export enum CloudinaryFolder {
  Reels = "reels",
  UserPRofile = "user_profiles",
  PostImages = 'post_images',
  PostVideos = 'post_videos',
  userStories = 'user_stories',
  messageImages = 'message_photos',
  messageVideos = 'message_videos',
}

export enum FriendshipStatus {
  accepted = "accepted",
  rejected = 'rejected',
  pending = 'pending',
}

export enum RequestTypes {
  sent = "sent",
  recieved = "recieved"
}