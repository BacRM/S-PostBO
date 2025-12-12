/**
 * Plugin Vite pour créer des endpoints API proxy
 * Permet d'appeler l'API LinkedIn depuis le client sans problème CORS
 */

export function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      // Endpoint pour publier un post LinkedIn
      server.middlewares.use('/api/linkedin/publish', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const { text, accessToken } = JSON.parse(body);

              if (!text || !accessToken) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'text and accessToken are required' }));
                return;
              }

              // Récupérer le profil utilisateur pour obtenir l'URN
              const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });

              if (!profileResponse.ok) {
                const errorData = await profileResponse.json().catch(() => ({}));
                res.writeHead(profileResponse.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Failed to get user profile',
                  details: errorData 
                }));
                return;
              }

              const profileData = await profileResponse.json();
              const personUrn = `urn:li:person:${profileData.sub}`;

              // Créer le post UGC (même format que S-Plugin)
              const ugcPostData = {
                author: personUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                  'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                      text: text.trim(),
                    },
                    shareMediaCategory: 'NONE',
                  },
                },
                visibility: {
                  'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                },
              };

              // Publier le post via l'API LinkedIn
              const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(ugcPostData),
              });

              const responseData = await postResponse.json().catch(() => ({}));

              if (!postResponse.ok) {
                res.writeHead(postResponse.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: 'Failed to publish post',
                  status: postResponse.status,
                  details: responseData 
                }));
                return;
              }

              // Succès
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                postUrn: responseData.id,
                postId: responseData.id,
                id: responseData.id,
                data: responseData,
              }));
            } catch (error) {
              console.error('[API Plugin] Error:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('[API Plugin] Error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message 
          }));
        }
      });
    },
  };
}

