/**
 * 다른 서버로 요청을 보내기 위해 axios 패키지를 사용한다.
 * 프로미스 기반으로 동작하므로 async/await 문접과 함께 사용할 수 있고 다른 패키지에 비해 직관적으로 요청을 보낼 수 있다.
 * axios.get(주소, {headers : {헤더}})를 하면 주소에 헤더와 함께 GET 요청을 보내는것이고
 * axios.post(주소, {데이터})를 하면 해당 주소에 POST 요청을 보내면서 요청 본문에 데이터를 실어 보낸다.
 * 응답 결과는 await으로 받은 객체의 data 속성에 들어 있다.
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();
// const URL = 'http://localhost:8002/v1';
const URL = 'http://lo/calhost:8002/v2';

const request = async (req, api) => {
    try {
        if (!req.session.jwt) { // 세션에 토큰이 없으면
            const tokenResult = await axios.post(`${URL}/token`, {
                clientSecret : process.env.CLIENT_SECRET,
            });
            req.session.jwt = tokenResult.data.token; // 세션에 토큰 저장
        }
        return await axios.get(`${URL}${api}`, {
            headers : {authorization : req.session.jwt},
        }); // API 요청
    } catch (error) {
        console.error(error);
        if (error.response.status < 500) { // 410이나 419처럼 의도된 에러면 발생
            return error.response;
        }

        throw error;
    }
};

router.get('/mypost', async (req, res, next) => {
    try {
        const result = await request(req, '/posts/my');
        res.json(result.data);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/search/:hashtag', async (req, res, next) => {
    try {
        const result = await request(
            req, `/posts/hashtag/${encodeURIComponent(req.params.hashtag)}`,
        );
        res.json(result.data);
    } catch (error) {
        if (error.code) {
            console.error(error);
            next(error);
        }
    }
});

// 테스트용 라우터
router.get('/test', async (req, res, next) => {
    try {
        if (!req.session.jwt) {
            const tokenResult = await axios.post('http://localhost:8002/v1/token', {
                clientSecret : process.env.CLIENT_SECRET,
            });

            if (tokenResult.data && tokenResult.data.code === 200) { // 토큰 발급 성공
                req.session.jwt = tokenResult.data.token; // 세션에 토큰 저장
            } else { // 토큰 발급 실패
                return res.json(tokenResult.data); // 발급 실패 사유 응답
            }
        }

        // 발급 받은 토큰 테스트
        const result = await axios.get('http://localhost:8002/v1/test', {
            headers : {authorization : req.session.jwt},
        });

        return res.json(result.data);
    } catch (error) {
        console.error(error);
        if (error.response.status === 419) { // 토큰 만료 시
            return res.json(error.response.data);
        }
        return next(error);
    }
});

// 프론트 단에서 Webserver_Api_nodebird의 서버 API를 호출하는경우
// 요청을 보내는 클라이언트(8003)와 요청을 받는 서버(8002)의 도메인이 다르기 때문에 Access-Control-Allow-Origin 헤더가 없다는 에러가 발생한다.
// 이 문제를 해결하기 위해서 응답 헤더에 Access-Control-Allow-Origin 이라는 헤더를 넣어주어야 한다.
// 응답 헤더를 조작하려면 서버쪽에 cors 모듈을 설치해야 한다.
router.get('/', (req, res) => {
    res.render('main', {key : process.env.CLIENT_SECRET});
});

module.exports = router;