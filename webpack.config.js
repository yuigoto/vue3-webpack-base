const autoprefixer = require("autoprefixer");
const copyWebpack = require("copy-webpack-plugin");
const fs = require("fs");
const highlight = require("highlight.js");
const htmlWebpack = require("html-webpack-plugin");
const markdownIt = require("markdown-it");
const markdownItEmoji = require("markdown-it-emoji");
const miniCssExtract = require("mini-css-extract-plugin");
const mode = require("frontmatter-markdown-loader/mode");
const path = require("path");
const sass = require("sass");
const { VueLoaderPlugin } = require("vue-loader");

/**
 * Diretório de trabalho atual, sempre relativo ao diretório de onde é 
 * executado o webpack.
 * 
 * @type {string}
 */
const THE_CWD = process.cwd();

/**
 * @param {*} env 
 *     Informações relativas ao ambiente
 * @param {*} argv 
 *     Argumentos passados ao Webpack
 * @returns {import("webpack").Configuration}
 */
 module.exports = (env, argv) => {
  /**
   * Estamos, ou não, em ambiente de produção?
   * 
   * @type {bool}
   */
  const isProduction = argv.mode === "production";

  // STYLESHEET LOADERS
  // --------------------------------------------------------------------
  
  // CSS padrão
  const cssLoader = {
    loader: "css-loader",
    options: {
      // Resolução de @import
      importLoaders: 2,
      sourceMap: false,
    },
  };
  
  // Post CSS
  const postCssLoader = {
    loader: "postcss-loader",
    options: {
      sourceMap: false,
      postcssOptions: {
        plugins: [
          autoprefixer({
            flexbox: "no-2009"
          }),
        ],
      },
    },
  };

  // SASS
  const sassLoader = {
    loader: "sass-loader",
    options: {
      // Forçamos o uso de `sass`, ao invés de `node-sass`
      implementation: sass,
      sourceMap: false,
      sassOptions: {
        precision: 8,
        outputStyle: "compressed",
        sourceComments: false,
        includePaths: [
          path.resolve(THE_CWD, "src", "styles"),
        ],
        quietDeps: true,
      },
    },
  };

  // Styles globais
  const styleLoader = isProduction
    ? miniCssExtract.loader 
    : "vue-style-loader";

  // CONFIGURAÇÃO
  // --------------------------------------------------------------------

  /**
   * @type {import("webpack").Configuration}
   */
  const webpackConfig = {};

  webpackConfig.stats = {
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: true,
    chunks: false,
    modules: false,
    reasons: false,
    children: false,
    source: false,
    errors: true,
    errorDetails: true,
    warnings: false,
    publicPath: false
  };

  webpackConfig.target = "web";
  
  webpackConfig.mode = !isProduction ? "development" : "production";

  webpackConfig.entry = {
    build: path.resolve(THE_CWD, "./src", "index.js"),
  };
  
  webpackConfig.devtool = false;
  
  webpackConfig.output = {
    // Inclui comentários sobre caminho dos arquivos
    pathinfo: false,
    path: path.resolve(THE_CWD, "dist"),
    filename: "[name].bundle.js",
    publicPath: "/",
    clean: true,
  };
  
  webpackConfig.module = {
    rules: [
      {
        test: /\.vue$/,
        use: {
          loader: "vue-loader",
        },
      },
      
      // JavaScript e Módulos JS
      {
        test: /\.(js|mjs)$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    browsers: [
                      "last 2 Chrome versions",
                      "last 2 Firefox versions",
                      "last 2 Safari versions",
                      "last 2 iOS versions",
                      "last 1 Android version",
                      "last 1 ChromeAndroid version",
                      // Usando isso aqui `regenerator-runtime` dá pau:
                      // "ie 11"
                    ],
                  },
                },
              ]
            ],
            plugins: [
              "dynamic-import-node",
              "@babel/plugin-transform-runtime",
              "@babel/plugin-proposal-class-properties",
            ],
          },
        }
      },

      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          styleLoader,
          cssLoader,
          postCssLoader,
          sassLoader,
        ],
      },
      

      // Fonts (exceto SVG)
      {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        use: {
          loader: "file-loader",
          options: {
            esModule: false,
            outputPath: "assets/fonts/",
            publicPath: "/assets/fonts",
          }
        }
      },

      // Imagens
      {
        test: /\.(png|jpg|jpeg|gif|webp|svg)$/,
        use: {
          loader: "file-loader",
          options: {
            esModule: false,
            outputPath: "assets/img/",
            publicPath: "/assets/img",
          }
        }
      },

      // Mídia
      {
        test: /\.(wav|mp3|mp4|avi|mpg|mpeg|mov|ogg|webm)$/,
        use: {
          loader: "file-loader",
          options: {
            esModule: false,
            outputPath: "assets/media/",
            publicPath: "/assets/media",
          }
        }
      },

      // Documentos
      {
        test: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/,
        use: {
          loader: "file-loader",
          options: {
            esModule: false,
            outputPath: "assets/data/",
            publicPath: "/assets/data",
          }
        }
      },

      // Markdown, because we can
      {
        test: /\.md$/,
        use: {
          loader: "frontmatter-markdown-loader",
          options: {
            markdownIt: markdownIt({
              html: true,
              xhtmlOut: true,
              langPrefix: "language-",
              highlight: (str, lang) => {
                if (lang && highlight.getLanguage(lang)) {
                  try {
                    return (
                      `<pre class="hljs"><code>${highlight.highlight(
                        str, 
                        {
                          language: lang, 
                          ignoreIllegals: true
                        }
                      ).value}</code></pre>`
                    );
                  } catch (__) {
                    console.log("Nothing to catch here.");
                  }
                }
  
                return (
                  `<pre class="hljs"><code>${markdownIt({
                    html: true,
                    xhtmlOut: true,
                    langPrefix: "language-"
                  }).utils.escapeHtml(str)}</code></pre>`
                );
              },
            }).use(markdownItEmoji),
            mode: [
              // Por enquanto, a lib não consegue detectar compiler :/
              // mode.VUE_COMPONENT,
              mode.HTML,
              mode.META
            ],
            vue: {
              root: "markdown-content",
            },
          },
        },
      },
    ]
  };

  webpackConfig.plugins = [
    new VueLoaderPlugin(),

    new htmlWebpack({
      inject: true,
      filename: "index.html",
      template: path.join(THE_CWD, "public", "index.html"),
      hash: true,
      minify: {
        minifyJS: true,
        minifyCSS: true,
        removeComments: true,
        collapseWhitespace: true,
      },
    }),

    new copyWebpack({
      patterns: [
        {
          from: "public",
          to: "",
          toType: "dir",
          globOptions: {
            dot: true,
            ignore: [
              "**/*.html",
            ],
          },
        }
      ],
    }),

    new miniCssExtract({
      filename: "[name].css",
    }),
  ];

  webpackConfig.devServer = {
    hot: true,
    port: 3000
  };

  webpackConfig.optimization = {
    minimize: true,
    splitChunks: {
      chunks: "all",
      // Número máximo de requests paralelos em um entrypoint
      maxInitialRequests: Infinity,
      // Tamanho mínimo, em bytes, para um chunk ser gerado
      minSize: 0,
      cacheGroups: {
        build: {
          name: "build",
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
        },
      },
    },
  };

  webpackConfig.resolve = {
    modules: [
      path.resolve(THE_CWD, "./src"),
      "node_modules",
    ],
    alias: {
      vue: "@vue/runtime-dom"
    }, 
    extensions: [
      ".vue",
      ".js",
      ".jsx",
      ".mjs",
      ".json",
    ],
  };

  return webpackConfig;
 };
