const { connectDB, disconnectDB } = require("../config/db");
const env = require("../config/env");
const BlogArticle = require("../models/BlogArticle.model");
const User = require("../models/User.model");
const { sanitizeRichText } = require("../validators/blog.validator");

const initialArticles = [
  {
    slug: "what-is-gajak",
    title: "What Is Gajak? A Guide to This Traditional Indian Sweet",
    category: "Gajak Guide",
    excerpt:
      "Get to know gajak: the crisp, sesame-and-jaggery sweet enjoyed through India's cooler months, its many regional styles, and how it is traditionally made.",
    seoTitle: "What Is Gajak? Ingredients, Varieties & Tradition | Raja Gajak",
    metaDescription:
      "Learn what gajak is, how sesame and jaggery come together, common varieties, traditional preparation, and when this Indian sweet is enjoyed.",
    image: "/blog/gajak-guide.svg",
    imageAlt: "Golden sesame gajak pieces arranged on a serving plate",
    content: `<h2>A sweet made with sesame and jaggery</h2><p>Gajak is a traditional Indian sweet commonly associated with the cooler season. At its heart are til (sesame seeds) and gur (jaggery), brought together to make a sweet that can range from crisp and brittle to layered and gently chewy.</p><p>Recipes differ from family to family and from place to place. Some versions keep sesame at the centre, while others include nuts or use a different balance of ingredients.</p><h2>Ingredients and popular varieties</h2><p>Sesame contributes a toasted, nutty flavour; jaggery gives sweetness and helps bind the mixture. Depending on the recipe, gajak may also include nuts, ghee, or other ingredients. Til gajak and gur gajak are familiar names, while layered and dry-fruit versions offer other textures and tastes.</p><ul><li>Til gajak highlights the aroma and bite of sesame.</li><li>Gur gajak describes versions where jaggery is a defining part of the recipe.</li><li>Some regional and shop-made varieties add nuts or use different shaping and layering techniques.</li></ul><h2>How traditional gajak is prepared</h2><p>In a traditional method, sesame is roasted and jaggery is heated until it reaches a workable consistency. The ingredients are combined, then quickly shaped, pressed, or layered before the mixture sets. The temperature and timing affect the final texture, which is one reason handmade batches can vary.</p><h2>When people enjoy gajak</h2><p>Gajak is especially associated with winter gatherings and seasonal celebrations in many parts of India. It is also shared as a snack or offered to guests. Its place at the table is as much about familiar seasonal customs as it is about its sweet, toasted flavour.</p><h2>In short</h2><p>Gajak brings together a small set of ingredients and a careful preparation method, with plenty of room for regional styles. Exploring the ingredients and texture of each variety is the best way to find the one you enjoy.</p>`,
  },
  {
    slug: "til-gajak-vs-gur-gajak",
    title: "Til Gajak vs Gur Gajak: Understanding the Difference",
    category: "Gajak Guide",
    excerpt:
      "Sesame and jaggery both shape gajak's character. Here is how their balance and preparation can change a piece's flavour, crunch, and finish.",
    seoTitle: "Til Gajak vs Gur Gajak: Taste & Texture | Raja Gajak",
    metaDescription:
      "Understand the difference between til gajak and gur gajak, including sesame, jaggery, preparation, taste, and texture variations.",
    image: "/blog/til-vs-gur.svg",
    imageAlt: "Sesame seeds and jaggery beside pieces of traditional gajak",
    content: `<h2>Two ingredients, different emphasis</h2><p>Til means sesame and gur means jaggery. In everyday descriptions of gajak, these names point to the ingredients that give a recipe much of its identity. They do not always describe one fixed recipe: proportions and methods can vary between makers.</p><p>Sesame brings a toasted, savoury-nutty note, while jaggery contributes sweetness and a warm caramel-like flavour. The finished sweet depends on how the ingredients are combined and cooked.</p><h2>Texture depends on the method</h2><p>A thinly rolled or pressed mixture can set crisp, while thicker or layered preparations may have a different bite. Roasting changes sesame's aroma, and the stage to which jaggery is heated influences how firmly the mixture sets. Handmade batches may therefore differ slightly in appearance and texture.</p><h2>Choosing what you enjoy</h2><p>If you enjoy a pronounced toasted-seed flavour, look for a variety where til is prominent. If you prefer the deeper sweetness of gur, choose a preparation that foregrounds jaggery. Neither name alone guarantees a particular texture, so the product description and ingredient information are useful guides.</p><p>Recipes differ, and no one variety is universally better or healthier than another. Choose based on taste, texture, and the ingredients that suit you.</p><h2>Explore current varieties</h2><p>The names and ingredients used for a sweet can vary between recipes. Check the details on the current product page before ordering.</p><h2>The takeaway</h2><p>Til and gur each contribute something distinctive, but the maker's proportions and technique bring the final gajak together. A little attention to the product description can help you choose your preferred balance.</p>`,
  },
  {
    slug: "traditional-winter-sweets-india",
    title: "Traditional Winter Sweets to Enjoy in India",
    category: "Traditional Sweets",
    excerpt:
      "From sesame gajak to regional ladoos and other seasonal favourites, winter sweets reflect local ingredients, family recipes, and the pleasure of sharing.",
    seoTitle: "Traditional Winter Sweets in India | Raja Gajak",
    metaDescription:
      "Explore gajak and other regional Indian winter sweets, and learn how seasonal ingredients and local traditions shape these favourites.",
    image: "/blog/winter-sweets.svg",
    imageAlt: "A selection of Indian winter sweets including gajak and sesame ladoos",
    content: `<h2>Seasonal sweets, shared traditions</h2><p>Across India, cooler weather brings familiar sweets to family tables, local shops, and seasonal gatherings. The recipes are wonderfully varied: ingredients, names, and customs can change from one region to another, and many families have their own versions.</p><p>These foods are part of culinary and cultural traditions. They are enjoyed for their flavours and their place in a season, not as a substitute for dietary or medical advice.</p><h2>A few favourites from different kitchens</h2><p>Gajak is a well-known sesame-and-jaggery sweet, often found in crisp or layered forms. Revdi and til ladoo also bring sesame and sweetness together, shaped in their own ways. In other regions, households prepare seasonal dishes such as panjiri, gond ke ladoo, or warming halwas, each with local variations.</p><p>This is a small selection, not a complete list. Availability and the recipes people make depend on the region, family, and season.</p><h2>Why winter recipes feel special</h2><p>Seasonal ingredients and shared preparation give these sweets a sense of occasion. Families may make them together, exchange them with neighbours, or serve them when people gather. The traditions are as diverse as India's many food cultures.</p><h2>Discover gajak varieties</h2><p>Interested in gajak and other traditional sweets? Browse the shop to see what is currently listed.</p><h2>A season to savour</h2><p>Whether it is a piece of gajak or a recipe passed down at home, winter sweets invite people to slow down and share something familiar. Exploring their regional differences is part of the pleasure.</p>`,
  },
  {
    slug: "dry-fruits-anjeer-pin-khajoor-sweets",
    title: "Dry Fruits, Anjeer and Pin Khajoor in Traditional Sweets",
    category: "Ingredients",
    excerpt:
      "Learn how nuts, anjeer, and pin khajoor contribute flavour and texture to traditional sweets—and why it is worth checking each product's ingredients.",
    seoTitle: "Dry Fruits, Anjeer & Pin Khajoor in Sweets | Raja Gajak",
    metaDescription:
      "Discover how dry fruits, anjeer, and pin khajoor are used in traditional sweets, and how to check product-specific ingredient details.",
    image: "/blog/dry-fruits.svg",
    imageAlt: "Dry fruits, figs, and pin khajoor arranged with traditional sweets",
    content: `<h2>Ingredients that add character</h2><p>Dry fruits appear in many styles of Indian sweet-making. Chopped nuts can add a firm bite and a rich, rounded flavour; the exact result depends on the variety and how it is prepared. Some recipes fold them into a mixture, while others use them as a topping or filling.</p><h2>Anjeer brings its own texture</h2><p>Anjeer (fig) has a distinctive seed-speckled texture and a naturally deep sweetness. In sweets it may be chopped, softened, or blended into a filling or mixture. The final flavour and feel depend on the recipe and the other ingredients used alongside it.</p><h2>Pin khajoor in traditional recipes</h2><p>Pin khajoor is used in some traditional sweet preparations for its characteristic flavour and soft, dense texture. Preparation styles vary, and a product bearing this ingredient in its name may still include other ingredients as part of its recipe.</p><h2>Check each product's ingredient details</h2><p>Recipes are not identical from one sweet to another. If you have an allergy, dietary restriction, or ingredient preference, read the information on the specific product listing and packaging before buying or eating. Contact the seller through its official channels if you need clarification.</p><h2>Small details make every recipe different</h2><p>Dry fruits, anjeer, and pin khajoor each bring their own flavour and texture. Knowing how an ingredient is used—and checking the details for each product—helps you choose a sweet with confidence.</p>`,
  },
  {
    slug: "how-to-store-gajak",
    title: "How to Store Gajak and Keep It Fresh",
    category: "Gajak Guide",
    excerpt:
      "Protect gajak from moisture, follow the storage guidance on its packaging, and use the maker's instructions rather than relying on a one-size-fits-all shelf life.",
    seoTitle: "How to Store Gajak and Keep It Fresh | Raja Gajak",
    metaDescription:
      "Practical tips for storing gajak: follow package instructions, keep it protected from moisture, and check the product's recommended period.",
    image: "/blog/storing-gajak.svg",
    imageAlt: "Gajak pieces stored in a sealed container in a dry kitchen",
    content: `<h2>Start with the product packaging</h2><p>Different gajak recipes and packages can have different storage requirements. Follow the instructions printed on the product packaging or provided by the maker, including any guidance about temperature, refrigeration, or use-by dates.</p><h2>Keep moisture out</h2><p>If the packaging says to keep the product sealed after opening, close it securely or transfer the sweet to a clean, airtight container. Choose a dry place away from steam, spills, and dampness. Moisture can change the texture of crisp sweets.</p><ul><li>Use clean, dry hands or utensils when serving.</li><li>Close the package promptly after taking a portion.</li><li>Keep different sweets in separate containers if their packaging recommends it.</li></ul><h2>Use the maker's guidance</h2><p>There is no single storage period that applies to every gajak. Ingredients, preparation, packaging, and storage conditions all matter. Check the date and instructions supplied for your particular product, and do not rely on a general estimate in place of that information.</p><p>If the packaging is damaged or you are unsure whether a product is suitable to eat, check with the seller before consuming it.</p><h2>Enjoy it as intended</h2><p>Thoughtful storage helps preserve the texture and flavour the maker intended. The current shop pages provide details for the varieties listed by RAJA GAJAK®.</p><h2>A simple reminder</h2><p>Protect gajak from moisture, keep it as directed, and follow the product-specific packaging instructions for the best guidance.</p>`,
  },
  {
    slug: "traditional-gajak-in-bhopal",
    title: "Where to Find Traditional Gajak in Bhopal",
    category: "Food & Festive Traditions",
    excerpt:
      "Gajak is a familiar seasonal sweet in Bhopal. Learn about RAJA GAJAK® and how to check the website for its current product listings.",
    seoTitle: "Where to Find Traditional Gajak in Bhopal | Raja Gajak",
    metaDescription:
      "Discover RAJA GAJAK®, a Bhopal brand serving gajak and traditional sweets since 2006, and browse the website's current product listings.",
    image: "/blog/gajak-bhopal.svg",
    imageAlt: "Traditional sesame gajak served on a plate with a Bhopal city motif",
    content: `<h2>Gajak and Bhopal's seasonal food culture</h2><p>In Bhopal, as in many parts of central India, gajak is enjoyed as a seasonal sweet, shared at home and found through local sweet sellers. Sesame and jaggery give it a recognisable taste, while recipes and textures differ between makers.</p><h2>About RAJA GAJAK®</h2><p>RAJA GAJAK® is a trademark-registered name in gajak and sweets, serving pure taste and tradition since 2006. The brand is based in Bhopal, Madhya Pradesh, and focuses on traditional gajak and sweets.</p><p>The website's product listings show what is currently offered. Selection and availability may change, so check the live shop catalog.</p><h2>Choosing a variety</h2><p>Read each product description for the listed ingredients and details before ordering. Recipes vary, and customers with allergies or dietary requirements should check the specific product information and packaging.</p><p>For current ordering information, use the official website and its available checkout details. This article does not provide an address, opening hours, or delivery coverage.</p><h2>A local tradition, enjoyed your way</h2><p>Whether you prefer a crisp sesame bite or another traditional preparation, gajak is part of the seasonal sweet-making story shared across Bhopal and beyond. Exploring the current shop listings is the best way to see what is available from RAJA GAJAK®.</p>`,
  },
];

const seedBlogArticles = async () => {
  await connectDB(env.mongoUri);
  try {
    await BlogArticle.init();
    const admin = await User.findOne({ role: /^admin$/i }).select("_id").lean();
    if (!admin) throw new Error("Create an admin account before seeding blog drafts.");

    let inserted = 0;
    for (const article of initialArticles) {
      const result = await BlogArticle.updateOne(
        { slug: article.slug },
        {
          $setOnInsert: {
            ...article,
            content: sanitizeRichText(article.content),
            status: "draft",
            publishedAt: null,
            createdBy: admin._id,
            updatedBy: admin._id,
          },
        },
        { upsert: true, runValidators: true },
      );
      inserted += result.upsertedCount;
    }
    console.log(`Blog seed complete: inserted ${inserted} drafts; existing slugs left unchanged.`);
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  seedBlogArticles().catch((error) => {
    console.error(`Blog seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { initialArticles, seedBlogArticles };
