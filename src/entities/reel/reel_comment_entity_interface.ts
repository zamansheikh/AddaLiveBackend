
export interface IReelCommentEntity {
    commentedBy: string,
    commentedTo: string,
    article: string,
    parentComment?: string,
   reactionsCount?: number,
}