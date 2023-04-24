import { Injectable } from '@nestjs/common';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import {ChatGlm6BLLM} from '../chat_models/chatglm-6b'
import { LLMChain, RetrievalQAChain } from 'langchain/chains';
//import { ChatGlm6BLLm } from '../llms/chatglm_6b_llm';
import { T2VLargeChineseEmbeddings } from '../embeddings/text2vec-large-chinese.embedding';
import { CohereEmbeddings } from "langchain/embeddings/cohere";
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";
import { BufferWindowMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
//import { AppModule } from '../module/app.module';
//import { NestFactory } from '@nestjs/core';
// import { OpenAI } from 'langchain/llms/openai';

@Injectable()
export class AppService {
  async run() {
    // Create docs with a loader
    //const model = new ChatGlm6BLLm({});
    const loader = new DirectoryLoader(
      "./fileUpload",
      {
        //".json": (path) => new JSONLoader(path, "/texts"),
        //".jsonl": (path) => new JSONLinesLoader(path, "/html"),
        ".txt": (path) => new TextLoader(path),
        ".docx": (path) => new DocxLoader(path),
        ".pdf":(path) => new PDFLoader(path),
        //".csv": (path) => new CSVLoader(path, "text"),
      }
    );
   /*  const loader = new TextLoader(
      //'src/config/config.default.ts'
      `./fileUpload`
    ); */
    const docs = await loader.load();
    console.log(docs)
    // console.log({ docs });
    // Load the docs into the vector store

    const vectorStore = await HNSWLib.fromDocuments(
      docs,
      //new CohereEmbeddings({apiKey:'UQhKlkpjHhEQkMszkxdTmoH4Ioh7Zo8cxvCGxSYF'})
      new T2VLargeChineseEmbeddings()
    );
    const directory = './fileProcessing';
    await vectorStore.save(directory);

    // Load the vector store from the same directory
    

    // Search for the most similar document
    /* const chain = RetrievalQAChain.fromLLM(
      model,
      loadedVectorStore.asRetriever()
    );
    const res = await chain.call({
      query: 'What did the president say about Justice Breyer?',
    });
    console.log({ res }); */
    /* const result = await loadedVectorStore.similaritySearch('hello world', 1);
    console.log(result); */
  }
async chatfile(chatcontent,history) {
//根据内容回答问题
//const app = await NestFactory.create(AppModule);
const directory = './fileProcessing';
const loadedVectorStore = await HNSWLib.load(
  directory,
  //new CohereEmbeddings({apiKey:'UQhKlkpjHhEQkMszkxdTmoH4Ioh7Zo8cxvCGxSYF'})
  new T2VLargeChineseEmbeddings()
);
const result = await loadedVectorStore.similaritySearch(chatcontent, 1);
const fileSourceStr = result[0].metadata.source
//console.log(app.getUrl() + '/static' +fileSourceStr.split("\\")[fileSourceStr.split("\\").length-1]);

const chat = new ChatGlm6BLLM({ temperature: 0.01 ,history:history});
const translationPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `使用以下文段, 用中文回答用户问题。如果无法从中得到答案，请说'没有足够的相关信息'。已知内容:${result[0].pageContent}`
  ),
  /* new MessagesPlaceholder("history"), */
  HumanMessagePromptTemplate.fromTemplate("{text}"),
]);
/* const memory = new BufferMemory({ returnMessages: true, memoryKey: "history" });
console.log(1111111,memory); */

/* const chain = new ConversationChain({  prompt: translationPrompt,llm: chat, memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }), }); */
const chain = new LLMChain({
  prompt: translationPrompt,
  llm: chat,
});
const responseB = await chain.call({
  text: chatcontent,
});
//responseB.push({link: '/static' +fileSourceStr.split("\\")[fileSourceStr.split("\\").length-1]})

 return {
    response: responseB,
    url: '/static/' +fileSourceStr.split("\\")[fileSourceStr.split("\\").length-1]
 }

}

async chat(chatcontent,history) {
  //根据内容回答问题
  //const app = await NestFactory.create(AppModule);
  
  const chat = new ChatGlm6BLLM({ temperature: 0.01 ,history:history});
  const translationPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `你是开江内部助手，可以回答用户的问题，提供有用信息，帮助完成文字工作`
    ),
    /* new MessagesPlaceholder("history"), */
    HumanMessagePromptTemplate.fromTemplate("{text}"),
  ]);
  /* const memory = new BufferMemory({ returnMessages: true, memoryKey: "history" });
  console.log(1111111,memory); */
  
  /* const chain = new ConversationChain({  prompt: translationPrompt,llm: chat, memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }), }); */
  const chain = new LLMChain({
    prompt: translationPrompt,
    llm: chat,
  });
  const responseB = await chain.call({
    text: chatcontent,
  });
  //responseB.push({link: '/static' +fileSourceStr.split("\\")[fileSourceStr.split("\\").length-1]})
  
   return  responseB
      
  
  
  }

  getHello() {
    return { hello: 'world' };
  }
}
