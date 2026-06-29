export interface RecommendationModel {
    predict(
        userId: string,
        movieId: string
    ): Promise<number>;

    recommend(
        userId: string,
        limit: number
    ): Promise<string[]>;
}