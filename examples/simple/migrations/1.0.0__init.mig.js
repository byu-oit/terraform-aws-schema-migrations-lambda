module.exports.up = async ({client}) => {
    await client.query('create table if not exists users(id int, name text);')
}

module.exports.down = async ({client}) => {
    await client.query('drop table users;')
}