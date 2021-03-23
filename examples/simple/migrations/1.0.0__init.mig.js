exports.up = async ({context: {client}}) => {
    await client.query('create table if not exists users (id int, name text);')
}

exports.down = async ({context: {client}}) => {
    await client.query('drop table users;')
}