import type { RecommendationModel } from "../../domain/services/Recommendation.js";

export class TensorflowRecommendationModel implements RecommendationModel {

    predict(userId: string, movieId: string): Promise<number> {
        // Add tensor flow logic here
        throw new Error("Method not implemented.");
    }
    recommend(userId: string, limit: string): Promise<string[]> {
        // model inference here

        throw new Error("Method not implemented.");
    }
    
}
