import axios from "axios";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as AR from "fp-ts/Array";
import * as O from "fp-ts/Option";
import { pipe } from "fp-ts/function";
import { Embedding } from "openai/resources";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * query: Query to use for vector search
 */
interface SymphonyRequest {
  query: string;
}

/**
 * documents: List of documents returned by vector search
 */
interface SymphonyResponse {
  messages: [];
}

/**
 * Perform search to retrieve history of past messages
 */
export default async function handler(
  request: SymphonyRequest
): Promise<SymphonyResponse> {
  const { query } = request;

  const { data: embeddings } = await openai.embeddings.create({
    input: query,
    model: "text-embedding-ada-002",
  });

  const { data: documents } = await axios.post(
    `http://0.0.0.0:3002/rpc/match_embeddings`,
    {
      query: pipe(
        embeddings,
        AR.head,
        O.map((embedding: Embedding) => embedding.embedding),
        O.getOrElse(() => [])
      ),
      threshold: 0.5,
      count: 10,
    }
  );

  return {
    messages: documents.map((document) => document.message.content),
  };
}
