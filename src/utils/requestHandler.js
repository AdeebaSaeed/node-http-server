import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { getRequestData } from './getRequestData.js';
import { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import { URLPattern } from 'urlpattern-polyfill';

// Function to read data from user file
export const readUsersFile = async () => {
  try {
    const fileData = await fs.promises.readFile('data/users.json');
    return JSON.parse(fileData);
  } catch (error) {
    console.log('Error while reading user file:', error);
    return [];
  }
};

// Function to read data from post file
export const readPostsFile = async () => {
  try {
    const fileData = await fs.promises.readFile('data/posts.json');
    return JSON.parse(fileData);
  } catch (error) {
    console.log('Error while reading posts file:', error);
    return [];
  }
};

// Function to write data to user.json
export const writeUsersFile = async (data) => {
  try {
    const fileData = JSON.stringify(data);
    await fs.promises.writeFile('data/users.json', fileData);
    console.log('User file successfully written.');
  } catch (error) {
    console.log('Error while writing user file:', error);
  }
};

// Function to write data to posts.json
export const writePostsFile = async (data) => {
  try {
    const fileData = JSON.stringify(data);
    await fs.promises.writeFile('data/posts.json', fileData);
    console.log('Posts file successfully written.');
  } catch (error) {
    console.log('Error while writing posts file:', error);
  }
};



/**
 * This function manages an HTTP request
 *
 * @param {IncomingMessage} request
 * @param {ServerResponse} response
 */
export const requestHandler = async (request, response) => {
  const { headers, method, url } = request;
  const { address, port } = request.socket.server.address();
  const fullEndpoint = `http://${address}:${port}${url}`;

  console.log(url);
  const path = url.split('/')[1];

  const data = {
    error: ReasonPhrases.OK,
    message: 'success',
  };

  switch (path) {
    case 'users': {
      const usersPattern = new URLPattern({ pathname: '/users/:id' });
      const usersEndpoint = usersPattern.exec(fullEndpoint);
      const id = usersEndpoint?.pathname?.groups?.id;

      switch (method) {
        case 'POST': // Create a new user
            const body = await getRequestData(request);
            const newUser = JSON.parse(body);

            // Convert the ID to an integer
            newUser.id = parseInt(newUser.id);

            // Save the new user to the users.json file
            const users = await readUsersFile();
            users.push(newUser);
            await writeUsersFile(users);

            // Send response
            response.setHeader('Content-Type','application/json');
            response.statusCode = StatusCodes.CREATED;
            data.error = ReasonPhrases.CREATED
            data.message = 'User created';
            data.newUser = newUser;
            break;

        case 'GET':
          if (url === '/users') {
            // Get all users
            console.log('Getting All Users');
            const users = await readUsersFile();
            data.error = ReasonPhrases.OK;
            data.message = 'Getting all users';
            data.users = users;
            response.statusCode = StatusCodes.OK;
          } else if (url.startsWith('/users/')) {
            // Get user by ID
            const userId = parseInt(url.split('/')[2]);
            console.log(`Getting User By ID: ${userId}`);
            const users = await readUsersFile();
            const user = users.find((user) => user.id === userId);
            if (user) {
              data.error = ReasonPhrases.OK;
              data.message = 'Found the user';
              data.user = user;
              response.statusCode = StatusCodes.OK;
            } else {
              data.error = ReasonPhrases.NOT_FOUND;
              data.message = `User with ID ${userId} not found`;
              response.statusCode = StatusCodes.NOT_FOUND;
            }
          } else {
            console.log('Invalid URL');
            data.error = ReasonPhrases.NOT_FOUND;
            data.message = 'Invalid URL';
            response.statusCode = StatusCodes.NOT_FOUND;
          }
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(data));
          break;

          case 'PATCH':
            if (id) {
              console.log(`Updating User By ID: ${id}`);
              try {
                const body = await getRequestData(request);
                const updatedUser = JSON.parse(body);
                const users = await readUsersFile();
                const user = users.find((user) => user.id === parseInt(id));
          
                if (user) {
                  Object.assign(user, updatedUser);
                  await writeUsersFile(users);
          
                  //send response
                  data.error = ReasonPhrases.OK;
                  data.message = 'User updated successfully';
                  data.user = user; // Updated line: Assign the updated user to 'data.user'
                  response.statusCode = StatusCodes.OK;
                } else {
                  console.log('User not found');
                  data.error = ReasonPhrases.NOT_FOUND;
                  data.message = 'User not found';
                  response.statusCode = StatusCodes.NOT_FOUND;
                }
              } catch (error) {
                console.log('Error while updating user:', error);
                data.error = ReasonPhrases.INTERNAL_SERVER_ERROR;
                data.message = 'Failed to update user';
                response.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
              } finally {
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify(data));
              }
            } else {
              console.log('Invalid request');
              data.error = ReasonPhrases.BAD_REQUEST;
              data.message = 'Invalid request';
              response.statusCode = StatusCodes.BAD_REQUEST;
              response.setHeader('Content-Type', 'application/json');
              response.end('Invalid request');
            }
            break;
          
        

        case 'DELETE':
          if (id) {
            console.log(`Deleting User By ID: ${id}`);
            const users = await readUsersFile();
            //find data to delete
            const userToDelete = users.find((user) => user.id === parseInt(id));
    if (userToDelete) {


            const deletedUsers = users.filter((user) => user.id !== parseInt(id));
            console.log(deletedUsers);
                //save deleted data
              await writeUsersFile(deletedUsers);
              //send response
              response.setHeader('Content-Type','application/json');
              response.statusCode = StatusCodes.OK;
              data.error = ReasonPhrases.OK;
              data.message = 'User deleted successfully';
            }  else {
              response.setHeader('Content-Type','application/json');
              response.statusCode =StatusCodes.NOT_FOUND;
              data.error = ReasonPhrases.NOT_FOUND;
              data.message = 'User not found';
            } 
          response.end(JSON.stringify(data));
          break;
          }
        default:
          response.setHeader('Content-Type','application/json');
          response.statusCode = StatusCodes.METHOD_NOT_ALLOWED;
          data.error = ReasonPhrases.METHOD_NOT_ALLOWED;
          data.message = 'Invalid request method';
          response.end(JSON.stringify(data));
          break;
      }
      break;
    }

    case 'posts': {
      const postsPattern = new URLPattern({ pathname: '/posts/:id' });
      const postsEndpoint = postsPattern.exec(fullEndpoint);
      const id = postsEndpoint?.pathname?.groups?.id;

      switch (method) {
        case 'POST': // Create a new post
          try {
            const body = await getRequestData(request);
            const newPost = JSON.parse(body);

            // Convert the ID to an integer
            newPost.id = parseInt(newPost.id);

            // Save the new post to the posts.json file
            const posts = await readPostsFile();
            posts.push(newPost);
            await writePostsFile(posts);

            // Send response
            data.message = 'Post created';
            data.newPost = newPost;
            response.statusCode = StatusCodes.OK;
          } catch (error) {
            console.log('Error while creating a new post:', error);
            data.error = ReasonPhrases.INTERNAL_SERVER_ERROR;
            data.message = 'Failed to create post';
            response.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
          } finally {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(data));
          }
          break;

        case 'GET':
          if (url === '/posts') {
            // Get all posts
            console.log('Getting All Posts');
            const posts = await readPostsFile();
            data.error = ReasonPhrases.OK;
            data.message = 'Getting all posts';
            data.posts = posts;
            response.statusCode = StatusCodes.OK;
          } else if (url.startsWith('/posts/')) {
            // Get post by ID
            const postId = parseInt(url.split('/')[2]);
            console.log(`Getting Post By ID: ${postId}`);
            const posts = await readPostsFile();
            const post = posts.find((post) => parseInt(post.post_id) === postId);
            if (post) {
              data.error = ReasonPhrases.OK;
              data.message = 'Found the post';
              data.post = post;
              response.statusCode = StatusCodes.OK;
            } else {
              data.error = ReasonPhrases.NOT_FOUND;
              data.message = `Post with ID ${postId} not found`;
              response.statusCode = StatusCodes.NOT_FOUND;
            }
          } else {
            console.log('Invalid URL');
            data.error = ReasonPhrases.NOT_FOUND;
            data.message = 'Invalid URL';
            response.statusCode = StatusCodes.NOT_FOUND;
          }
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(data));
          break;

        case 'PATCH':
          if (id) {
            console.log(`Updating Post By ID: ${id}`);
            try {
              const body = await getRequestData(request);
              const updatedPost = JSON.parse(body);
              const posts = await readPostsFile();
              const index = posts.findIndex((post) => parseInt(post.post_id) === parseInt(id));
              if (index !== -1) {
                posts[index] = { ...posts[index], ...updatedPost };
                await writePostsFile(posts);
                data.error = ReasonPhrases.OK;
                data.message = 'Post updated successfully';
                data.post = posts[index];
                response.statusCode = StatusCodes.OK;
              } else {
                console.log('Post not found');
                data.error = ReasonPhrases.NOT_FOUND;
                data.message = 'Post not found';
                response.statusCode = StatusCodes.NOT_FOUND;
              }
            } catch (error) {
              console.log('Error while updating post:', error);
              data.error = ReasonPhrases.INTERNAL_SERVER_ERROR;
              data.message = 'Failed to update post';
              response.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
            } finally {
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify(data));
            }
          } else {
            console.log('Invalid request');
            data.error = ReasonPhrases.BAD_REQUEST;
            data.message = 'Invalid request';
            response.statusCode = StatusCodes.BAD_REQUEST;
            response.setHeader('Content-Type', 'application/json');
            response.end('Invalid request');
          }
          break;

        case 'DELETE':
          console.log('ID:', id);
          if ((id)) {
            console.log(`Deleting Post By ID: ${id}`);
            const posts = await readPostsFile();

            const existingPost = posts.find((post) => parseInt(post.post_id) === parseInt(id));
    if (existingPost) {

            const deletedPost = posts.filter((post) => parseInt(post.post_id) !== parseInt(id));
             //save deleted posts
             await writePostsFile(deletedPost);
              //send response
              response.setHeader('Content-Type','application/json')
              response.statusCode = StatusCodes.OK;
              data.error = ReasonPhrases.OK;
              data.message = 'post deleted successfully';
            } else {
              response.setHeader('Content-Type','application/json')
              response.statusCode = StatusCodes.NOT_FOUND;
              data.error = ReasonPhrases.NOT_FOUND;
              data.message = 'Method not allowed';
            }
            response.end(JSON.stringify(data));
          break;
          }
        default:
          response.setHeader('Content-Type', 'application/json');
          response.statusCode = StatusCodes.METHOD_NOT_ALLOWED;
          data.error = ReasonPhrases.METHOD_NOT_ALLOWED;
          data.message = 'Invalid request method';
          response.end('Invalid request method');
          break;
      }
      break;
    }

    default:
      response.setHeader('Content-Type', 'application/json');
      response.statusCode = StatusCodes.NOT_FOUND;
      data.error = ReasonPhrases.NOT_FOUND;
      data.message = 'Invalid endpoint';
      break;
  }
};
