'use client';

import React from 'react';
import { Text, Panel, H1, Box } from '@bigcommerce/big-design';
import Image from 'next/image';

const HomePage = () => (
  <Box
    marginHorizontal={{ mobile: 'none', tablet: 'xxxLarge' }}
    marginVertical={{ mobile: 'none', tablet: 'xxLarge' }}
  >
    <H1>AI Salesman</H1>
    <Panel header="Increase your sales using ultimate AI-based salesman">
      <Text>
        AI Salesman is a chatbot powered by Google's VertexAI artificial intelligence platform. It can respond to user queries in a human-like way, making it an ideal tool for increasing sales on your BigCommerce online store. AI Salesman can understand what users are looking for by asking them appropriate questions, and then suggest the best products for them.
      </Text>
      <Image
        src="https://img.freepik.com/premium-photo/cyborg-head-artificial-intelligence-3d-rendering_117023-271.jpg?w=740"
        alt="Example"
        width={740}
        height={500}
        priority={true}
      />
      <Text>With AI Salesman, you can open up a world of new opportunities for your online store. By providing a more personalized and engaging shopping experience, AI Salesman can help you to attract more customers and boost your sales.</Text>
      <Text>
        Open the exiting world of opportunities with AI-Salesman
      </Text>
      <Text>Here are some specific benefits of using AI Salesman for your BigCommerce store:</Text>
      <ul>
        <li>Increased sales: AI Salesman can help you to increase sales by recommending the right products to the right customers. It can also upsell and cross-sell products, which can lead to even more sales.</li>
        <li>Improved customer service: AI Salesman can answer customer questions and resolve issues quickly and efficiently. This can help to improve customer satisfaction and loyalty.</li>
        <li>Personalized shopping experience: AI Salesman can learn about your customers' interests and preferences over time. This allows it to provide a more personalized shopping experience, which can lead to more sales.</li>
        <li>Increased efficiency: AI Salesman can automate many of the tasks involved in running an online store. This can free up your time to focus on other aspects of your business, such as marketing and product development.</li>
      </ul>
    </Panel>
  </Box>
);

export default HomePage;
